import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Initializing...");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const initializedRef = useRef(false);
  const evtSourceRef = useRef(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initSession() {
      try {
        // FingerprintJS
        const FingerprintJS = (await import("fingerprintjs2")).default;
        const components = await FingerprintJS.getPromise();
        const fingerprint = components.map(c => c.value).join("");

        const res = await fetch("/api/session/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint }),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error("Failed to initialize session:", res.status, errorBody);
          setStatus(`Error: Failed to initialize session. Server responded with ${res.status}.`);
          return;
        }

        const data = await res.json();
        if (data.error) {
          setStatus(`Error from API: ${data.error}`);
          return;
        }

        setSession(data);
        setQrDataUrl(data.qrDataUrl);
        setStatus("QR Ready - Scan to connect");

        // SSE listener
        if (evtSourceRef.current) {
          evtSourceRef.current.close();
        }
        const evtSource = new EventSource(`/api/events?token=${data.token}`);
        evtSourceRef.current = evtSource;
        evtSource.onerror = (e) => {
          console.log('SSE error:', e);
        };
        evtSource.onmessage = e => {
          console.log('Received SSE event:', e.data);
          const event = JSON.parse(e.data);
          if (event.state === "verified") {
            setStatus("Connected!");
            evtSource.close();
            evtSourceRef.current = null;
          } else {
            setStatus(event.state);
          }
        };
      } catch (error) {
        console.error("Error during session initialization:", error);
        setStatus(`An unexpected error occurred: ${error.message}`);
      }
    }

    initSession();

    return () => {
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
        evtSourceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Embed Demo</h2>
      {session && <p>Session ID: {session.token}</p>}
      <p>Session status: {status}</p>
      <div id="qr">
        {qrDataUrl && <img src={qrDataUrl} style={{ width: "150px" }} alt="QR Code for session" />}
      </div>
    </div>
  );
}