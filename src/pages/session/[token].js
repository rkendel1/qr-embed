import { useState, useEffect } from "react";
import Head from 'next/head';
import Script from 'next/script';
import { supabaseAdmin } from "@/lib/supabase-admin";

export default function QRPage({ token, session, sessionError }) {
  const [fingerprint, setFingerprint] = useState(null);
  const [error, setError] = useState(sessionError);
  const [isApproving, setIsApproving] = useState(false);
  const [isScriptReady, setIsScriptReady] = useState(false);

  useEffect(() => {
    if (!isScriptReady || sessionError) return;

    const generateFingerprint = async () => {
      try {
        // The FingerprintJS global is available because the Script has loaded
        const fp = await window.FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (err) {
        console.error("Fingerprint generation failed:", err);
        setError(err.message || "Could not initialize session. Please try again.");
      }
    };

    generateFingerprint();
  }, [isScriptReady, sessionError]);

  const handleApprove = async () => {
    if (!fingerprint || isApproving) {
      return;
    }
    setIsApproving(true);
    setError(null);
    try {
      const apiUrl = new URL("/api/session/approve", window.location.origin);
      const res = await fetch(apiUrl.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fingerprint }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Approval request failed with status: ${res.status}`);
      }

      if (data.successUrl) {
        window.location.replace(`/approved?redirectUrl=${encodeURIComponent(data.successUrl)}`);
      } else {
        window.location.replace('/approved');
      }
    } catch (error) {
      console.error("Approval failed:", error);
      setError(error.message || "Could not approve the connection.");
      setIsApproving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Approve Connection</title>
      </Head>
      <Script
        src="https://openfpcdn.io/fingerprintjs/v4/iife.min.js"
        strategy="afterInteractive"
        onReady={() => setIsScriptReady(true)}
      />
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Connection?</h2>
          {error ? (
            <p className="text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          ) : (
            <button
              onClick={handleApprove}
              disabled={!fingerprint || isApproving}
              className="w-full px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isApproving ? 'Approving...' : (fingerprint ? 'Approve' : 'Initializing...')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const { token } = context.params;
  let sessionError = null;

  let { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Error fetching session with admin client:", fetchError);
    return { notFound: true };
  }

  if (session.state === 'init' || session.state === 'loaded') {
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ state: 'scanned', scanned_at: new Date().toISOString() })
      .eq('token', token)
      .select()
      .single();
    
    if (updateError || !updatedSession) {
      console.error("Failed during scan step update:", updateError);
      sessionError = "Could not update session status.";
    } else {
      session = updatedSession;
      // Broadcast the 'scanned' state change
      const channel = supabaseAdmin.channel(`session-updates-${token}`);
      await channel.send({
        type: 'broadcast',
        event: 'STATE_CHANGE',
        payload: { state: 'scanned' },
      });
    }
  }

  return { 
    props: { 
      token, 
      session: JSON.parse(JSON.stringify(session)), 
      sessionError 
    } 
  };
}