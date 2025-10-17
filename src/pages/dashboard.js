import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import ToggleSwitch from "@/components/ToggleSwitch";

export default function Dashboard() {
  const [embedName, setEmbedName] = useState("");
  const [embeds, setEmbeds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [copied, setCopied] = useState(null);
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
    } catch (error)
      {
      console.error("Error generating embed:", error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' },
        () => {
          fetchSessions();
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

  const handleToggleEmbed = async (embedId, currentStatus) => {
    const originalEmbeds = embeds;
    setEmbeds(embeds.map(e => e.id === embedId ? { ...e, is_active: !currentStatus } : e));

    try {
      const res = await fetch('/api/embed/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: embedId, is_active: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle embed');
      }
    } catch (error) {
      console.error("Error toggling embed:", error);
      setEmbeds(originalEmbeds);
    }
  };

  const StatusPill = ({ state }) => {
    const stateStyles = {
      init: "bg-blue-100 text-blue-800",
      loaded: "bg-yellow-100 text-yellow-800",
      scanned: "bg-orange-100 text-orange-800",
      verified: "bg-green-100 text-green-800",
      default: "bg-gray-100 text-gray-800",
    };
    const style = stateStyles[state] || stateStyles.default;
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>{state}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateEmbed()}
                />
                <button onClick={handleGenerateEmbed} disabled={generating || !embedName.trim()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                  {generating ? '...' : 'Create'}
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">My Embeds</h2>
              {loading.embeds ? <p className="text-sm text-gray-500">Loading embeds...</p> :
                embeds.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {embeds.map(embed => (
                      <li key={embed.id} className="py-3">
                        <div className="flex justify-between items-center">
                          <p className={`font-medium truncate pr-4 ${!embed.is_active ? 'text-gray-400' : ''}`}>{embed.name}</p>
                          <div className="flex items-center space-x-4 flex-shrink-0">
                            <ToggleSwitch
                              enabled={embed.is_active}
                              onChange={() => handleToggleEmbed(embed.id, embed.is_active)}
                            />
                            <a href={`/demo/${embed.template_token}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
                              Demo
                            </a>
                            <button onClick={() => handleCopy(getEmbedCode(embed), `embed-code-${embed.id}`)} className="text-sm text-indigo-600 hover:underline">
                              {copied === `embed-code-${embed.id}` ? 'Copied!' : 'Code'}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No embeds created yet.</p>
                )
              }
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Live Sessions</h2>
              <button onClick={fetchSessions} disabled={loading.sessions} className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                {loading.sessions ? '...' : 'Refresh'}
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {loading.sessions ? <p className="text-sm text-gray-500 text-center p-8">Loading sessions...</p> :
                sessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Embed</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sessions.map((s) => (
                          <tr key={s.token}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.embeds?.name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusPill state={s.state} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-col space-y-1">
                                <p>Token: <code className="text-xs bg-gray-100 p-1 rounded">{s.token.substring(0, 8)}...</code></p>
                                {s.fingerprint && <p>Device FP: <code className="text-xs bg-gray-100 p-1 rounded truncate max-w-[10ch] inline-block">{s.fingerprint}</code></p>}
                                {s.mobile_fingerprint && <p>Mobile FP: <code className="text-xs bg-gray-100 p-1 rounded truncate max-w-[10ch] inline-block">{s.mobile_fingerprint}</code></p>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-500">No active sessions.</p>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}