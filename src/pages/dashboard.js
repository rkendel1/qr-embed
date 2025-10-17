import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

export default function Dashboard() {
  const [context, setContext] = useState("marketing");
  const [embedCode, setEmbedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [copiedToken, setCopiedToken] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [newSessionToken, setNewSessionToken] = useState(null);

  // Update embed code whenever context changes
  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const code = `<div id="qr-embed-container" data-context="${context}" data-host="${origin}"></div>
<script src="${origin}/embed.js" defer><\/script>`;
    setEmbedCode(code);
    setCopied(false);
  }, [context]);

  // Generate QR code data URL when a session's QR URL is selected
  useEffect(() => {
    if (qrCodeUrl) {
      QRCode.toDataURL(qrCodeUrl, { width: 256 })
        .then(url => {
          const modal = document.getElementById('qr-modal');
          const img = modal.querySelector('img');
          img.src = url;
          modal.classList.remove('hidden');
        })
        .catch(err => {
          console.error(err);
          setQrCodeUrl(null);
        });
    } else {
      const modal = document.getElementById('qr-modal');
      if (modal) modal.classList.add('hidden');
    }
  }, [qrCodeUrl]);

  // Initial fetch for sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setSessions(data);
      } catch (error) {
        console.error("Error fetching initial sessions:", error);
      }
    };
    fetchSessions();
  }, []);

  // Real-time subscription for session changes
  useEffect(() => {
    const channel = supabase
      .channel('sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions(currentSessions => [payload.new, ...currentSessions]);
            setNewSessionToken(payload.new.token); // Highlight the new session
            setTimeout(() => setNewSessionToken(null), 5000); // Remove highlight after 5 seconds
          } else if (payload.eventType === 'UPDATE') {
            setSessions(currentSessions =>
              currentSessions.map(s =>
                s.token === payload.new.token ? payload.new : s
              )
            );
          }
        }
      )
      .subscribe();

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
    <>
      {/* QR Code Modal */}
      <div id="qr-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setQrCodeUrl(null)}>
        <div className="bg-white p-4 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
          <img src="" alt="QR Code" />
          <button onClick={() => setQrCodeUrl(null)} className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Close</button>
        </div>
      </div>

      <div className="min-h-screen bg-gray-50 text-gray-800">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Embed Code</h2>
            <div className="flex-grow mb-4">
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
            <p className="text-sm text-gray-500 mb-4">
              Paste this snippet into your website. A new session will be created and highlighted below as soon as a user visits the page.
            </p>
            <div className="relative bg-gray-800 rounded-md p-4 text-white font-mono text-sm overflow-x-auto">
              <button
                onClick={() => handleCopy(embedCode, 'embed')}
                className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white font-sans text-xs font-bold py-1 px-2 rounded"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <pre><code>{embedCode}</code></pre>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Live Sessions</h3>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sessions.length > 0 ? sessions.map((s) => (
                  <li key={s.token} className={`transition-colors duration-1000 ${s.token === newSessionToken ? 'bg-indigo-50' : 'bg-white'}`}>
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
                            Device FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.fingerprint}</code>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          <p>
                            {new Date(s.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button onClick={() => setQrCodeUrl(s.qr_url)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                          Show QR Code
                        </button>
                      </div>
                    </div>
                  </li>
                )) : (
                  <li className="px-4 py-4 sm:px-6 text-sm text-gray-500">No active sessions. Paste your embed code on a site to see a session appear here.</li>
                )}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}