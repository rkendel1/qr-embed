import { useState, useRef, useEffect } from "react";

export default function Dashboard() {
  const [context, setContext] = useState("marketing");
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const evtSourceRef = useRef(null);
  const [sessions, setSessions] = useState([]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/session/list");
      if (!res.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateEmbed = async () => {
    setStatus("Initializing...");
    setQrDataUrl(null);
    setSession(null);

    if (evtSourceRef.current) {
      evtSourceRef.current.close();
    }

    try {
      const FingerprintJS = (await import("fingerprintjs2")).default;
      const components = await FingerprintJS.getPromise();
      const fingerprint = components.map(c => c.value).join("");

      const res = await fetch("/api/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, context }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setSession(data);
      setQrDataUrl(data.qrDataUrl);
      setStatus("QR Ready - Scan to connect");
      fetchSessions(); // Refresh the list

      // SSE listener
      const evtSource = new EventSource(`/api/events?token=${data.token}`);
      evtSourceRef.current = evtSource;
      evtSource.onmessage = e => {
        const event = JSON.parse(e.data);
        if (event.state === "verified") {
          setStatus("Connected!");
          evtSource.close();
          evtSourceRef.current = null;
        } else {
          setStatus(`Status: ${event.state}`);
        }
      };
      evtSource.onerror = () => {
        setStatus("Connection error. Retrying...");
      };

    } catch (error) {
      console.error("Error creating embed:", error);
      setStatus(`Error: ${error.message}`);
    }
  };

  const StatusPill = ({ state }) => {
    const stateStyles = {
      init: "bg-gray-100 text-gray-800",
      verified: "bg-green-100 text-green-800",
      default: "bg-yellow-100 text-yellow-800",
    };
    const style = stateStyles[state] || stateStyles.default;
    return (
      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
        {state}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Embed</h2>
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-grow">
              <label htmlFor="context" className="block text-sm font-medium text-gray-700">
                Embed Context
              </label>
              <input
                type="text"
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., marketing, support"
              />
            </div>
            <button
              onClick={handleCreateEmbed}
              className="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Generate QR Code
            </button>
          </div>
        </div>

        {status !== "Ready" && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">New Session Details</h3>
            <p className="text-sm text-gray-600 mb-4">
              Status: <span className="font-semibold">{status}</span>
            </p>
            {session && (
              <p className="text-sm text-gray-600 mb-4">
                Session ID: <code className="text-xs bg-gray-100 p-1 rounded">{session.token}</code>
              </p>
            )}
            <div className="flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                status.startsWith("Initializing") && (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-md">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Sessions</h3>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sessions.length > 0 ? sessions.map((s) => (
                <li key={s.token}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        Context: {s.context}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <StatusPill state={s.state} />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <code className="text-xs bg-gray-100 p-1 rounded">{s.token}</code>
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          {new Date(s.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              )) : (
                <li className="px-4 py-4 sm:px-6 text-sm text-gray-500">No sessions found.</li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}