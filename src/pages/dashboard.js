import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import ToggleSwitch from "@/components/ToggleSwitch";

export default function Dashboard() {
  const [embedName, setEmbedName] = useState("");
  const [embeds, setEmbeds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState({ embeds: false, sessions: false });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmbeds = useCallback(async () => {
    setLoading(prev => ({ ...prev, embeds: true }));
    try {
      const res = await fetch('/api/embed/list');
      if (!res.ok) throw new Error('Failed to fetch embeds');
      const data = await res.json();
      setEmbeds(data);
    } catch (error) {
      console.error("Error fetching embeds:", error);
      setError(error.message);
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
      setError(error.message);
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
    setError(null);
    try {
      const res = await fetch('/api/embed/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: embedName }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create embed');
      }
      const newEmbed = await res.json();
      setEmbeds([newEmbed, ...embeds]);
      setEmbedName("");
    } catch (error) {
      console.error("Error generating embed:", error);
      setError(error.message);
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
    setError(null);
    const originalEmbeds = embeds;
    const originalSessions = sessions;

    setEmbeds(embeds.map(e => e.id === embedId ? { ...e, is_active: !currentStatus } : e));
    setSessions(sessions.map(s => {
      if (s.embeds && s.embeds.id === embedId) {
        return { ...s, embeds: { ...s.embeds, is_active: !currentStatus } };
      }
      return s;
    }));

    try {
      const res = await fetch('/api/embed/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: embedId, is_active: !currentStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to toggle embed status.');
      }
    } catch (error) {
      console.error("Error toggling embed:", error);
      setError(error.message);
      setEmbeds(originalEmbeds);
      setSessions(originalSessions);
    }
  };

  const tableRows = useMemo(() => {
    const sessionEmbedIds = new Set(sessions.map(s => s.embed_id));
    const embedsWithoutSessions = embeds.filter(e => !sessionEmbedIds.has(e.id));

    const sessionRows = sessions;
    const embedOnlyRows = embedsWithoutSessions.map(embed => ({
      token: `embed-only-${embed.id}`,
      state: 'no_sessions',
      created_at: embed.created_at,
      embeds: embed,
      isPlaceholder: true,
    }));

    const allRows = [...sessionRows, ...embedOnlyRows];
    allRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return allRows;
  }, [sessions, embeds]);

  const StatusPill = ({ state }) => {
    const stateStyles = {
      init: "bg-blue-100 text-blue-800",
      loaded: "bg-yellow-100 text-yellow-800",
      scanned: "bg-orange-100 text-orange-800",
      verified: "bg-green-100 text-green-800",
      no_sessions: "bg-gray-100 text-gray-800",
      default: "bg-gray-100 text-gray-800",
    };
    const stateText = {
      no_sessions: "No sessions",
    };
    const style = stateStyles[state] || stateStyles.default;
    const text = stateText[state] || state;
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>{text}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </button>
          </div>
        )}
        <div className="space-y-8">
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

          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Embeds & Sessions</h2>
              <button onClick={fetchSessions} disabled={loading.sessions} className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                {loading.sessions ? '...' : 'Refresh'}
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {(loading.sessions || loading.embeds) ? <p className="text-sm text-gray-500 text-center p-8">Loading...</p> :
                tableRows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Embed</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tableRows.map((s) => (
                          <tr key={s.token}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.embeds?.name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><StatusPill state={s.state} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {s.isPlaceholder ? (
                                <span className="text-gray-400 italic">No session details</span>
                              ) : (
                                <div className="flex flex-col space-y-1">
                                  <p>Token: <code className="text-xs bg-gray-100 p-1 rounded">{s.token.substring(0, 8)}...</code></p>
                                  {s.fingerprint && <p>Device FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.fingerprint.substring(0, 8)}...</code></p>}
                                  {s.mobile_fingerprint && <p>Mobile FP: <code className="text-xs bg-gray-100 p-1 rounded">{s.mobile_fingerprint.substring(0, 8)}...</code></p>}
                                  {s.loaded_at && <p>Loaded: <code className="text-xs bg-gray-100 p-1 rounded">{new Date(s.loaded_at).toLocaleTimeString()}</code></p>}
                                  {s.scanned_at && <p>Scanned: <code className="text-xs bg-gray-100 p-1 rounded">{new Date(s.scanned_at).toLocaleTimeString()}</code></p>}
                                  {s.verified_at && <p>Verified: <code className="text-xs bg-gray-100 p-1 rounded">{new Date(s.verified_at).toLocaleTimeString()}</code></p>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {s.embeds ? (
                                <div className="flex items-center space-x-4">
                                  <ToggleSwitch
                                    enabled={s.embeds.is_active}
                                    onChange={() => handleToggleEmbed(s.embeds.id, s.embeds.is_active)}
                                  />
                                  <a href={`/demo/${s.embeds.template_token}`} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">
                                    Demo
                                  </a>
                                  <button onClick={() => handleCopy(getEmbedCode(s.embeds), `session-code-${s.token}`)} className="text-sm text-indigo-600 hover:underline">
                                    {copied === `session-code-${s.token}` ? 'Copied!' : 'Code'}
                                  </button>
                                </div>
                              ) : (
                                <span>-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <p className="text-gray-500">No embeds or sessions found.</p>
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