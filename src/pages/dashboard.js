import { useState, useRef, useEffect } from "react";

export default function Dashboard() {
  const [context, setContext] = useState("marketing");
  const [embedCode, setEmbedCode] = useState(null);
  const [copied, setCopied] = useState(false);
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

  // Fetch sessions on initial load and then set up a poller
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleCreateEmbed = () => {
    const origin = window.location.origin;
    const code = `<div id="qr-embed-container" data-context="${context}" data-host="${origin}"></div>
<script src="${origin}/embed.js" defer><\/script>`;
    setEmbedCode(code);
    setCopied(false);
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

  const handleCopy = () => {
    if (embedCode) {
      navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
              Generate Embed Code
            </button>
          </div>
        </div>

        {embedCode && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Embed Code</h3>
            <p className="text-sm text-gray-500 mb-2">Copy and paste this snippet into your website's HTML.</p>
            <div className="relative bg-gray-800 rounded-md p-4 text-white font-mono text-sm overflow-x-auto">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white font-sans text-xs font-bold py-1 px-2 rounded"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <pre><code>{embedCode}</code></pre>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Live Sessions</h3>
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
                      <div className="text-sm text-gray-500 overflow-hidden">
                        <p className="truncate">
                          Device FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.fingerprint}</code>
                        </p>
                        {s.mobile_fingerprint && (
                          <p className="truncate">
                            Paired FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.mobile_fingerprint}</code>
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 self-end">
                        <p>
                          {new Date(s.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              )) : (
                <li className="px-4 py-4 sm:px-6 text-sm text-gray-500">No active sessions.</li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}