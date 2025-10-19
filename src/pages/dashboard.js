import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import ToggleSwitch from "@/components/ToggleSwitch";

function EditEmbedForm({ embed, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    success_url_a: embed.success_url_a || '',
    success_url_b: embed.success_url_b || '',
    active_path: embed.active_path || 'A',
    routing_rule: embed.routing_rule || 'none',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePathChange = (path) => {
    setFormData(prev => ({ ...prev, active_path: path }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`success_url_a_${embed.id}`} className="block text-sm font-medium text-gray-700">Success URL (Path A)</label>
          <input
            type="url"
            id={`success_url_a_${embed.id}`}
            name="success_url_a"
            value={formData.success_url_a}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="https://example.com/path-a"
          />
        </div>
        <div>
          <label htmlFor={`success_url_b_${embed.id}`} className="block text-sm font-medium text-gray-700">Success URL (Path B)</label>
          <input
            type="url"
            id={`success_url_b_${embed.id}`}
            name="success_url_b"
            value={formData.success_url_b}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="https://example.com/path-b"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`routing_rule_${embed.id}`} className="block text-sm font-medium text-gray-700">Routing Rule</label>
        <select
          id={`routing_rule_${embed.id}`}
          name="routing_rule"
          value={formData.routing_rule}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="none">None (Use Default Path)</option>
          <option value="device_parity">Device Parity</option>
        </select>
        <p className="mt-2 text-sm text-gray-500">
          Device Parity: Routes to Path A if devices are different, Path B if they are the same.
        </p>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Default Active Path</span>
        <div className="flex items-center space-x-4">
          <button type="button" onClick={() => handlePathChange('A')} className={`px-4 py-2 text-sm font-medium rounded-md ${formData.active_path === 'A' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>Path A</button>
          <button type="button" onClick={() => handlePathChange('B')} className={`px-4 py-2 text-sm font-medium rounded-md ${formData.active_path === 'B' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border'}`}>Path B</button>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSaving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </form>
  );
}

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

function SessionList({ sessions }) {
  if (sessions.length === 0) {
    return <p className="text-center text-gray-500 py-4">No sessions for this embed yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sessions.map((session) => (
            <tr key={session.token}>
              <td className="px-4 py-3 whitespace-nowrap"><StatusPill state={session.state} /></td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(session.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                <div className="flex flex-col space-y-1">
                  <p>Token: <code className="text-xs bg-gray-100 p-1 rounded">{session.token.substring(0, 8)}...</code></p>
                  {session.fingerprint && <p>Device FP: <code className="text-xs bg-gray-100 p-1 rounded">{session.fingerprint.substring(0, 8)}...</code></p>}
                  {session.mobile_fingerprint && <p>Mobile FP: <code className="text-xs bg-gray-100 p-1 rounded">{session.mobile_fingerprint.substring(0, 8)}...</code></p>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [embedName, setEmbedName] = useState("");
  const [embeds, setEmbeds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState({ embeds: true, sessions: true });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeEmbedId, setActiveEmbedId] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions');

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

  useEffect(() => {
    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSessions)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSessions]);

  const sessionsByEmbed = sessions.reduce((acc, session) => {
    const embedId = session.embeds?.id;
    if (embedId) {
      if (!acc[embedId]) acc[embedId] = [];
      acc[embedId].push(session);
    }
    return acc;
  }, {});

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
      await fetchEmbeds();
      setEmbedName("");
    } catch (error) {
      console.error("Error generating embed:", error);
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

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
    const originalEmbeds = [...embeds];
    setEmbeds(embeds.map(e => e.id === embedId ? { ...e, is_active: !currentStatus } : e));

    try {
      const res = await fetch('/api/embed/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: embedId, is_active: !currentStatus }),
      });
      if (!res.ok) throw new Error('Failed to toggle embed status.');
    } catch (error) {
      console.error("Error toggling embed:", error);
      setError(error.message);
      setEmbeds(originalEmbeds);
    }
  };

  const handleUpdateEmbed = async (embedId, formData) => {
    setError(null);
    try {
      const res = await fetch('/api/embed/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: embedId, ...formData }),
      });
      if (!res.ok) throw new Error('Failed to update embed.');
      setActiveEmbedId(null);
      await fetchEmbeds();
    } catch (error) {
      console.error("Error updating embed:", error);
      setError(error.message);
    }
  };

  const handleToggleDetails = (embedId) => {
    if (activeEmbedId === embedId) {
      setActiveEmbedId(null);
    } else {
      setActiveEmbedId(embedId);
      setActiveTab('sessions');
    }
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
            <span className="block sm:inline ml-2">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 D 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </button>
          </div>
        )}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Embed</h2>
            <div className="flex rounded-md shadow-sm">
              <input type="text" value={embedName} onChange={(e) => setEmbedName(e.target.value)} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-l-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Marketing Campaign" onKeyDown={(e) => e.key === 'Enter' && handleGenerateEmbed()} />
              <button onClick={handleGenerateEmbed} disabled={generating || !embedName.trim()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">{generating ? '...' : 'Create'}</button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Embeds</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {loading.embeds ? <p className="text-center p-8">Loading embeds...</p> :
                embeds.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {embeds.map((embed) => (
                          <Fragment key={embed.id}>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{embed.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap"><ToggleSwitch enabled={embed.is_active} onChange={() => handleToggleEmbed(embed.id, embed.is_active)} /></td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(sessionsByEmbed[embed.id] || []).length}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(embed.created_at).toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                <button onClick={() => handleToggleDetails(embed.id)} className="text-indigo-600 hover:indigo-900">{activeEmbedId === embed.id ? 'Close' : 'Details'}</button>
                                <a href={`/demo/${embed.template_token}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Demo</a>
                                <button onClick={() => handleCopy(getEmbedCode(embed), embed.id)} className="text-indigo-600 hover:underline">{copied === embed.id ? 'Copied!' : 'Code'}</button>
                              </td>
                            </tr>
                            {activeEmbedId === embed.id && (
                              <tr>
                                <td colSpan="5" className="p-0">
                                  <div className="bg-gray-50 p-4">
                                    <div className="border-b border-gray-200 mb-4">
                                      <nav className="-mb-px flex space-x-6">
                                        <button onClick={() => setActiveTab('sessions')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'sessions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Sessions</button>
                                        <button onClick={() => setActiveTab('configure')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'configure' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Configuration</button>
                                      </nav>
                                    </div>
                                    <div>
                                      {activeTab === 'sessions' && <SessionList sessions={sessionsByEmbed[embed.id] || []} />}
                                      {activeTab === 'configure' && <EditEmbedForm embed={embed} onSave={(formData) => handleUpdateEmbed(embed.id, formData)} onCancel={() => setActiveEmbedId(null)} />}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-center p-8">No embeds created yet.</p>
              }
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}