import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";

export default function Dashboard() {
  const [embedName, setEmbedName] = useState("");
  const [embeds, setEmbeds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [copied, setCopied] = useState(null); // Can be embed ID or 'embed-code'
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState(null);
  const [loading, setLoading] = useState({ embeds: false, sessions: false });
  const [generating, setGenerating] = useState(false);

  const fetchEmbeds = useCallback(async () => {
    setLoading(prev => ({ ...prev, embeds: true }));
    try {
      const res = await fetch('/api/embed/list');
      if (!res.ok) throw new Error('Failed to fetch embeds');
      const data = await res.json();
      setEmbeds(data);
    } catch (error) {
      console.error("Error fetching embeds:", error);
    } finally {
      setLoading(prev => ({ ...prev, embeds: false }));
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(prev => ({ ...prev, sessions: true }));
    try {
      const res = await fetch('/api/session/list');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(prev => ({ ...prev, sessions: false }));
    }
  }, []);

  useEffect(() => {
    fetchEmbeds();
    fetchSessions();
  }, [fetchEmbeds, fetchSessions]);

  const handleGenerateEmbed = async () => {
    if (!embedName.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/embed/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: embedName }),
      });
      if (!res.ok) throw new Error('Failed to create embed');
      const newEmbed = await res.json();
      setEmbeds([newEmbed, ...embeds]);
      setEmbedName("");
    } catch (error) {
      console.error("Error generating embed:", error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' },
        (payload) => {
          fetchSessions(); // Refetch all sessions on any change for simplicity
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSessions]);

  const handleCopy = (textToCopy, id) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getEmbedCode = (embed) => {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `<script src="${origin}/embed.js" data-token="${embed.template_token}" data-host="${origin}" defer><\/script>`;
  };

  const StatusPill = ({ state }) => {
    const stateStyles = {
      init: "bg-blue-100 text-blue-800",
      scanned: "bg-orange-100 text-orange-800",
      verified: "bg-green-100 text-green-800",
      default: "bg-gray-100 text-gray-800",
    };
    const style = stateStyles[state] || stateStyles.default;
    return <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>{state}</p>;
  };

  return (
    <>
      {qrModalDataUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onClick={() => setQrCodeUrl(null)}>
          <div className="bg-white p-4 rounded-lg shadow-lg" onClick={(e) => e.stopPropagation()}>
            <img src={qrModalDataUrl} alt="QR Code" />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 text-gray-800">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Embed</h2>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={embedName}
                  onChange={(e) => setEmbedName(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Marketing Campaign"
                />
                <button onClick={handleGenerateEmbed} disabled={generating || !embedName.trim()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                  {generating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">My Embeds</h2>
              <ul className="divide-y divide-gray-200">
                {embeds.map(embed => (
                  <li key={embed.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">{embed.name}</p>
                      <div className="flex items-center space-x-4">
                        <a href={`/demo/${embed.template_token}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">
                          View Demo
                        </a>
                        <button onClick={() => handleCopy(getEmbedCode(embed), `embed-code-${embed.id}`)} className="text-sm text-indigo-600 hover:underline">
                          {copied === `embed-code-${embed.id}` ? 'Copied!' : 'Get Code'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Live Sessions</h3>
              <button onClick={fetchSessions} disabled={loading.sessions} className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                {loading.sessions ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sessions.map((s) => (
                  <li key={s.token} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        Embed: {s.embeds?.name || 'N/A'}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex"><StatusPill state={s.state} /></div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <code className="text-xs bg-gray-100 p-1 rounded truncate">{s.token}</code>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>Device FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.embed_fingerprint || 'N/A'}</code></p>
                      {s.mobile_fingerprint && <p>Mobile FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.mobile_fingerprint}</code></p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}