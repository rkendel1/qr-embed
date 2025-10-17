import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

export default function Dashboard() {
  const [context, setContext] = useState("marketing");
  const [embedCode, setEmbedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [copiedToken, setCopiedToken] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState(null);
  const [newSessionToken, setNewSessionToken] = useState(null);
  const [updatedSessionToken, setUpdatedSessionToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateCode = async () => {
    setGenerating(true);
    setEmbedCode('');
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create session');
      }

      const newSession = await res.json();
      
      setSessions(currentSessions => [newSession, ...currentSessions]);
      setNewSessionToken(newSession.token);
      setTimeout(() => setNewSessionToken(null), 5000);

      const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const code = `<div id="qr-embed-container" data-token="${newSession.token}" data-host="${origin}"></div>
<script src="${origin}/embed.js" defer><\/script>`;
      setEmbedCode(code);
      setCopied(false);
    } catch (error) {
      console.error("Error generating embed code:", error);
      setEmbedCode(`<p class="text-red-500">Error: ${error.message}</p>`);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (qrCodeUrl) {
      QRCode.toDataURL(qrCodeUrl, { width: 256 })
        .then(url => {
          setQrModalDataUrl(url);
        })
        .catch(err => {
          console.error(err);
          setQrCodeUrl(null);
        });
    } else {
      setQrModalDataUrl(null);
    }
  }, [qrCodeUrl]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const channel = supabase
      .channel('sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload) => {
          console.log('Real-time change received:', payload);
          if (payload.eventType === 'INSERT') {
            setSessions(currentSessions => {
              if (currentSessions.some(s => s.token === payload.new.token)) {
                return currentSessions;
              }
              return [payload.new, ...currentSessions];
            });
            setNewSessionToken(payload.new.token);
            setTimeout(() => setNewSessionToken(null), 5000);
          } else if (payload.eventType === 'UPDATE') {
            setSessions(currentSessions =>
              currentSessions.map(s =>
                s.token === payload.new.token ? payload.new : s
              )
            );
            setUpdatedSessionToken(payload.new.token);
            setTimeout(() => setUpdatedSessionToken(null), 5000);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Dashboard: Successfully subscribed to real-time session updates!');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Dashboard: Real-time subscription error:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCopy = (textToCopy, id) => {
    navigator.clipboard.writeText(textToCopy);
    if (id === 'embed') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedToken(id);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const StatusPill = ({ state }) => {
    const stateStyles = {
      pending: "bg-yellow-100 text-yellow-800",
      init: "bg-blue-100 text-blue-800",
      scanned: "bg-orange-100 text-orange-800",
      verified: "bg-green-100 text-green-800",
      default: "bg-gray-100 text-gray-800",
    };
    const style = stateStyles[state] || stateStyles.default;
    return (
      <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
        {state}
      </p>
    );
  };

  return (
    <>
      {qrModalDataUrl && (
        <div id="qr-modal" className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setQrCodeUrl(null)}>
          <div className="bg-white p-4 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
            <img src={qrModalDataUrl} alt="QR Code" />
            <button onClick={() => setQrCodeUrl(null)} className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 text-gray-800">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Generate Embed Code</h2>
            <div className="flex-grow mb-4">
              <label htmlFor="context" className="block text-sm font-medium text-gray-700">
                Embed Context
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., marketing, support"
                />
                <button
                  onClick={handleGenerateCode}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Click "Generate" to create a new session and get your embed code. A new session will appear below with a "pending" status.
            </p>
            {embedCode && (
              <div className="relative bg-gray-800 rounded-md p-4 text-white font-mono text-sm overflow-x-auto">
                <button
                  onClick={() => handleCopy(embedCode, 'embed')}
                  className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white font-sans text-xs font-bold py-1 px-2 rounded"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <pre><code>{embedCode}</code></pre>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Live Sessions</h3>
              <button
                onClick={fetchSessions}
                disabled={loading}
                className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sessions.length > 0 ? sessions.map((s) => (
                  <li key={s.token} className={`transition-colors duration-1000 ${s.token === newSessionToken ? 'bg-indigo-50' : s.token === updatedSessionToken ? 'bg-green-50' : 'bg-white'}`}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          Context: {s.context}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <StatusPill state={s.state} />
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div className="text-sm text-gray-600 flex items-center">
                          <span className="font-medium w-20">Session ID:</span>
                          <code className="text-xs bg-gray-100 p-1 rounded truncate">{s.token}</code>
                          <button onClick={() => handleCopy(s.token, s.token)} className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">{copiedToken === s.token ? 'Copied!' : 'Copy'}</button>
                        </div>
                        <div className="text-sm text-gray-500 overflow-hidden">
                          <p className="truncate">
                            {s.state === 'verified' ? 'Mobile FP' : 'Device FP'}: <code className="text-xs bg-gray-100 p-1 rounded">{s.fingerprint || 'N/A'}</code>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          <p>
                            {new Date(s.created_at).toLocaleString()}
                          </p>
                        </div>
                        {s.state !== 'pending' && (
                          <button onClick={() => setQrCodeUrl(s.qr_url)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                            Show QR Code
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )) : (
                  <li className="px-4 py-4 sm:px-6 text-sm text-gray-500">No active sessions. Generate an embed code to see a session appear here.</li>
                )}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}