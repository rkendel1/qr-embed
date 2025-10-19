import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function QRPage({ token, session, sessionError }) {
  const [approved, setApproved] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);
  const [error, setError] = useState(sessionError);

  useEffect(() => {
    if (sessionError) return; // Don't generate fingerprint if there's already an error

    async function generateFingerprint() {
      try {
        const FingerprintJS = (await import("fingerprintjs2")).default;
        const components = await FingerprintJS.getPromise();
        const values = components.map(c => c.value);
        const fp = FingerprintJS.x64hash128(values.join(""), 31);
        setFingerprint(fp);
      } catch (err) {
        console.error("Fingerprint generation failed:", err);
        setError("Could not initialize session. Please try again.");
      }
    }
    generateFingerprint();
  }, [sessionError]);

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
      if (error.message && error.message.includes("SUPABASE_SERVICE_KEY")) {
        setError("Could not approve connection due to a server configuration issue. Please contact support.");
      } else {
        setError(error.message);
      }
    }
  };

  const getDisplayError = () => {
    if (!error) return null;
    if (error.includes("SUPABASE_SERVICE_KEY")) {
      return "Could not connect due to a server configuration issue. Please contact support.";
    }
    return error;
  }
  const displayError = getDisplayError();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Connection?</h2>
        {displayError ? (
          <p className="text-red-600 bg-red-50 p-3 rounded-md">{displayError}</p>
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
  );
}

export async function getServerSideProps(context) {
  const { token } = context.params;
  let sessionError = null;

  let { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Error fetching session:", fetchError);
    return { notFound: true };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) {
    console.error("CRITICAL: NEXT_PUBLIC_APP_URL is not set. This is required for session scanning.");
    sessionError = "Server configuration error: App URL not specified.";
  } else if (session.state === 'init' || session.state === 'loaded') {
    try {
      const scanApiUrl = `${origin}/api/session/scan`;

      const res = await fetch(scanApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update session status.');
      }
      
      const { data: updatedSession, error: refetchError } = await supabase
        .from("sessions")
        .select("*")
        .eq("token", token)
        .single();
      
      if (refetchError || !updatedSession) {
        throw new Error("Could not retrieve updated session information.");
      }
      session = updatedSession;

    } catch (e) {
      console.error("Failed during scan step:", e.message);
      sessionError = e.message;
    }
  }

  return { props: { token, session, sessionError } };
}