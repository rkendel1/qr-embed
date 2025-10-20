import { useState } from "react";
import Script from 'next/script';
import { supabaseAdmin } from "@/lib/supabase-admin";

export default function QRPage({ token, session, sessionError }) {
  const [approved, setApproved] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);
  const [error, setError] = useState(sessionError);

  const handleFingerprintLoad = async () => {
    if (sessionError) return;
    try {
      // FingerprintJS is now available on the window object
      const fp = await window.FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    } catch (err) {
      console.error("Fingerprint generation failed:", err);
      setError("Could not initialize session. Please try again.");
    }
  };

  const handleApprove = async () => {
    if (!fingerprint) {
      setError("Fingerprint not generated yet. Please wait.");
      return;
    }
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
        window.location.replace(data.successUrl);
      } else {
        setApproved(true);
      }
    } catch (error) {
      console.error("Approval failed:", error);
      setError(error.message || "Could not approve the connection.");
    }
  };

  return (
    <>
      <Script 
        src="https://openfpcdn.io/fingerprintjs/v4" 
        onLoad={handleFingerprintLoad}
      />
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Connection?</h2>
          {error ? (
            <p className="text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          ) : approved ? (
            <p className="text-green-600">Approved! You can close this window.</p>
          ) : (
            <button
              onClick={handleApprove}
              disabled={!fingerprint}
              className="w-full px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {fingerprint ? 'Approve' : 'Initializing...'}
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

  // 1. Fetch the session using the admin client
  let { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Error fetching session with admin client:", fetchError);
    return { notFound: true };
  }

  // 2. If the session is new, update its state to 'scanned' directly.
  // This is much faster and more reliable than a self-calling API route.
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
      session = updatedSession; // Use the updated session data
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