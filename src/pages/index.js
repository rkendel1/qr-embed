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
      // FingerprintJS
      const FingerprintJS = (await import("fingerprintjs2")).default;
      const components = await FingerprintJS.getPromise();
      const fingerprint = components.map(c => c.value).join("");

      const res = await fetch("/api/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });

      const data = await res.json();
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
    }

    initSession();

    return () => {
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
        evtSourceRef.current = null;
      }
    };
  }, []);

  if (!session) return <div>Loading embed...</div>;

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Embed Demo</h2>
      <p>Session ID: {session?.token}</p>
      <p>Session status: {status}</p>
      <div id="qr">
        {qrDataUrl && <img src={qrDataUrl} style={{ width: "150px" }} alt="QR Code for session" />}
      </div>
    </div>
  );
}
