import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default function QRPage({ token, session }) {
  const [approved, setApproved] = useState(false);
  const [fingerprint, setFingerprint] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function generateFingerprint() {
      try {
        const FingerprintJS = (await import("fingerprintjs2")).default;
        const components = await FingerprintJS.getPromise();
        const fp = components.map(c => c.value).join("");
        setFingerprint(fp);
      } catch (err) {
        console.error("Fingerprint generation failed:", err);
        setError("Could not initialize session. Please try again.");
      }
    }
    generateFingerprint();
  }, []);

  const handleApprove = async () => {
    if (!fingerprint) {
      setError("Fingerprint not generated yet. Please wait.");
      return;
    }
    setError(null);
    try {
      // Construct an absolute URL to ensure the request goes to the correct host
      const apiUrl = new URL("/api/session/approve", window.location.origin);
      const res = await fetch(apiUrl.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fingerprint }),
      });

      if (!res.ok) {
        let errorMsg = `Approval request failed with status: ${res.status}`;
        try {
          const errorJson = await res.json();
          // Use the server's error message if available
          if (errorJson.error) {
            errorMsg = errorJson.error;
          }
        } catch (e) {
          // Response was not JSON, do nothing extra
        }
        throw new Error(errorMsg);
      }

      setApproved(true);
    } catch (error) {
      console.error("Approval failed:", error);
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Connection?</h2>
        {approved ? (
          <p className="text-green-600">Approved! You can close this window.</p>
        ) : (
          <>
            <button
              onClick={handleApprove}
              disabled={!fingerprint}
              className="w-full px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {fingerprint ? 'Approve' : 'Initializing...'}
            </button>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { token } = context.params;

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Error fetching session:", fetchError);
    return { notFound: true };
  }

  // If the session is in a pre-scanned state, update it to 'scanned'
  if (session.state === 'init' || session.state === 'loaded') {
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("sessions")
      .update({ state: "scanned" })
      .eq("token", token)
      .select()
      .single();

    if (updateError || !updatedSession) {
      console.error("Error updating session to 'scanned':", updateError);
      // Fallback to returning the original session to avoid a full error page
      return { props: { token, session } };
    }
    
    return { props: { token, session: updatedSession } };
  }

  return { props: { token, session } };
}