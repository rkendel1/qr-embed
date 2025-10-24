import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import ToggleSwitch from "@/components/ToggleSwitch";
import CreateEmbedWizard from "@/components/CreateEmbedWizard";
import CreateRoleWizard from "@/components/CreateRoleWizard";
import AppWizard from "@/components/AppWizard";
import { useAuth } from "@/auth/useAuth";

function EmbedManagement() {
  const [embeds, setEmbeds] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [knownRoutes, setKnownRoutes] = useState([]);
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState({ embeds: true, sessions: true, roles: true, routes: true, apps: true });
  const [error, setError] = useState(null);
  const [activeEmbedId, setActiveEmbedId] = useState(null);
  const [activeTab, setActiveTab] = useState('sessions');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchEmbeds = useCallback(async () => {
    setLoading(prev => ({ ...prev, embeds: true }));
    try {
      const res = await fetch('/api/embed/list', { cache: 'no-cache' });
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
      const res = await fetch('/api/session/list', { cache: 'no-cache' });
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

  const fetchAllRoles = useCallback(async () => {
    setLoading(prev => ({ ...prev, roles: true }));
    try {
      const res = await fetch('/api/roles/list', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setAllRoles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, roles: false }));
    }
  }, []);

  const fetchAllApps = useCallback(async () => {
    setLoading(prev => ({ ...prev, apps: true }));
    try {
      const res = await fetch('/api/apps/list', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to fetch apps');
      const data = await res.json();
      setAllApps(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, apps: false }));
    }
  }, []);

  const fetchKnownRoutes = useCallback(async () => {
    setLoading(prev => ({ ...prev, routes: true }));
    try {
      const res = await fetch('/api/routes/known/list');
      if (!res.ok) throw new Error('Failed to fetch known routes');
      const data = await res.json();
      setKnownRoutes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, routes: false }));
    }
  }, []);

  useEffect(() => {
    fetchEmbeds();
    fetchSessions();
    fetchAllRoles();
    fetchKnownRoutes();
    fetchAllApps();
  }, [fetchEmbeds, fetchSessions, fetchAllRoles, fetchKnownRoutes, fetchAllApps]);

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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'An unknown error occurred while updating.' }));
        throw new Error(errorData.error || 'Failed to update embed.');
      }
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
      const embed = embeds.find(e => e.id === embedId);
      setActiveEmbedId(embedId);
      const hasSessions = embed && (embed.component_type === 'qr_auth' || embed.component_type === 'mobile_otp' || embed.component_type === 'magic_link' || !embed.component_type);
      if (hasSessions) {
        setActiveTab('sessions');
      } else {
        setActiveTab('configure');
      }
    }
  };

  return (
    <>
      <CreateEmbedWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={fetchEmbeds}
        allRoles={allRoles}
        allApps={allApps}
      />
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline ml-2">{error}</span>
          <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </button>
        </div>
      )}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Manage Your Embeds</h2>
            <button onClick={() => setIsWizardOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Create New Embed</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading.embeds ? <p className="text-center p-8">Loading embeds...</p> :
              embeds.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">App</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {embeds.map((embed) => (
                        <Fragment key={embed.id}>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{embed.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{embed.apps?.name || <span className="italic text-gray-400">Unassigned</span>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getEmbedCategory(embed)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{embed.roles?.name || 'Default User'}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><ToggleSwitch enabled={embed.is_active} onChange={() => handleToggleEmbed(embed.id, embed.is_active)} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(embed.created_at).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                              <button onClick={() => handleToggleDetails(embed.id)} className="text-indigo-600 hover:indigo-900">{activeEmbedId === embed.id ? 'Close' : 'Details'}</button>
                              <a href={`/demo/${embed.template_token}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Demo</a>
                              <button onClick={() => handleCopy(getEmbedCode(embed), embed.id)} className="text-indigo-600 hover:underline">{copied === embed.id ? 'Copied!' : 'Code'}</button>
                            </td>
                          </tr>
                          {activeEmbedId === embed.id && (
                            <tr>
                              <td colSpan="7" className="p-0">
                                <div className="bg-gray-50 p-4">
                                  <div className="border-b border-gray-200 mb-4">
                                    <nav className="-mb-px flex space-x-6">
                                      {(embed.component_type === 'qr_auth' || embed.component_type === 'mobile_otp' || embed.component_type === 'magic_link' || !embed.component_type) && <button onClick={() => setActiveTab('sessions')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'sessions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Sessions</button>}
                                      <button onClick={() => setActiveTab('configure')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'configure' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Configuration</button>
                                    </nav>
                                  </div>
                                  <div>
                                    <div style={{ display: activeTab === 'sessions' ? 'block' : 'none' }}>
                                      <SessionList sessions={sessionsByEmbed[embed.id] || []} />
                                    </div>
                                    <div style={{ display: activeTab === 'configure' ? 'block' : 'none' }}>
                                      <EditEmbedForm embed={embed} allRoles={allRoles} knownRoutes={knownRoutes} onSave={(formData) => handleUpdateEmbed(embed.id, formData)} onCancel={() => setActiveEmbedId(null)} />
                                    </div>
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
    </>
  );
}

function AppManagement() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apps/list', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to fetch apps');
      const data = await res.json();
      setApps(data);
    } catch (error) {
      console.error("Error fetching apps:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleDeleteApp = async (appId) => {
    if (window.confirm('Are you sure you want to delete this app? Embeds associated with it will be unassigned.')) {
      setError(null);
      try {
        const res = await fetch('/api/apps/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId }),
        });
        if (!res.ok) throw new Error('Failed to delete app.');
        await fetchApps();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <>
      {isCreateModalOpen && (
        <CreateAppModal
          onClose={() => setCreateModalOpen(false)}
          onComplete={fetchApps}
        />
      )}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Manage Your Apps</h2>
            <button onClick={() => setCreateModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Create New App</button>
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? <p className="text-center p-8">Loading apps...</p> :
            apps.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apps.map((app) => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{app.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{app.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                          <button onClick={() => handleDeleteApp(app.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center p-8">No apps created yet.</p>
          }
        </div>
      </div>
    </>
  );
}

function CreateAppModal({ onClose, onComplete }) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/apps/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create app.');
      onComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900">Create New App</h2></div>
          <div className="p-6 space-y-6">
            {error && <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm">{error}</p>}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">App Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
              <input type="text" id="description" name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
            </div>
          </div>
          <div className="flex justify-end p-6 bg-gray-50 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving || !formData.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSaving ? 'Creating...' : 'Create App'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles/list', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/permissions/list');
      if (!res.ok) throw new Error('Failed to fetch permissions');
      const data = await res.json();
      setAllPermissions(data);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setError(error.message);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const handleUpdateRole = async (roleId, formData) => {
    setError(null);
    try {
      const res = await fetch('/api/roles/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roleId, ...formData }),
      });
      if (!res.ok) throw new Error('Failed to update role.');
      setActiveRoleId(null);
      await fetchRoles();
    } catch (error) {
      console.error("Error updating role:", error);
      setError(error.message);
    }
  };

  return (
    <>
      <CreateRoleWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={fetchRoles}
      />
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Manage Roles</h2>
            <button onClick={() => setIsWizardOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Create New Role</button>
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? <p className="text-center p-8">Loading roles...</p> :
            roles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Users</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.map((role) => (
                      <Fragment key={role.id}>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{role.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="relative group flex justify-center">
                              <span>{role.users?.length || 0}</span>
                              {(role.users?.length || 0) > 0 && (
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-gray-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg">
                                  <ul className="space-y-1 text-left">
                                    {role.users.map(user => <li key={user.id}>{user.email}</li>)}
                                  </ul>
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{(role.permissions || []).length}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onClick={() => setActiveRoleId(activeRoleId === role.id ? null : role.id)} className="text-indigo-600 hover:text-indigo-900">
                              {activeRoleId === role.id ? 'Close' : 'Edit'}
                            </button>
                          </td>
                        </tr>
                        {activeRoleId === role.id && (
                          <tr>
                            <td colSpan="5" className="p-0">
                              <EditRoleForm 
                                role={role} 
                                allPermissions={allPermissions}
                                onSave={(formData) => handleUpdateRole(role.id, formData)}
                                onCancel={() => setActiveRoleId(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center p-8">No roles created yet. Click [+ New Role] to start.</p>
          }
        </div>
      </div>
    </>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [managingRolesForUser, setManagingRolesForUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users/list', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchAllRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles/list', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setAllRoles(data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const refreshData = useCallback(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchAllRoles()]).finally(() => setLoading(false));
  }, [fetchUsers, fetchAllRoles]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleUpdateUserRoles = async (userId, roleIds) => {
    setError(null);
    try {
      const res = await fetch('/api/users/update-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleIds }),
      });
      if (!res.ok) throw new Error('Failed to update user roles.');
      setManagingRolesForUser(null);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setError(null);
      try {
        const res = await fetch('/api/users/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) throw new Error('Failed to delete user.');
        await fetchUsers();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <>
      {isCreateUserModalOpen && (
        <CreateUserModal
          allRoles={allRoles}
          onClose={() => setCreateUserModalOpen(false)}
          onComplete={refreshData}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onComplete={refreshData}
        />
      )}
      {managingRolesForUser && (
        <EditUserRolesModal
          user={managingRolesForUser}
          allRoles={allRoles}
          onClose={() => setManagingRolesForUser(null)}
          onSave={handleUpdateUserRoles}
        />
      )}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Manage Users</h2>
            <button onClick={() => setCreateUserModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Create User</button>
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? <p className="text-center p-8">Loading users...</p> :
            users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.roles.length > 0 ? user.roles.map(r => r.name).join(', ') : 'No roles'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                          <button onClick={() => setManagingRolesForUser(user)} className="text-indigo-600 hover:text-indigo-900">Manage Roles</button>
                          <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                          <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center p-8">No users found.</p>
          }
        </div>
      </div>
    </>
  );
}

function RouteManagement() {
  const [routes, setRoutes] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null); // null for new, or route object for editing

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [routesRes, rolesRes] = await Promise.all([
        fetch('/api/routes/list'),
        fetch('/api/roles/list'),
      ]);
      if (!routesRes.ok || !rolesRes.ok) throw new Error('Failed to fetch data');
      const routesData = await routesRes.json();
      const rolesData = await rolesRes.json();
      setRoutes(routesData);
      setAllRoles(rolesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (routeData) => {
    setError(null);
    try {
      const res = await fetch('/api/routes/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData),
      });
      if (!res.ok) throw new Error('Failed to save route permission');
      setEditingRoute(null);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (routePath) => {
    if (!window.confirm(`Are you sure you want to remove the protection for ${routePath}?`)) return;
    setError(null);
    try {
      const res = await fetch('/api/routes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_path: routePath }),
      });
      if (!res.ok) throw new Error('Failed to delete route permission');
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      {editingRoute && (
        <EditRouteModal
          route={editingRoute}
          allRoles={allRoles}
          onClose={() => setEditingRoute(null)}
          onSave={handleSave}
        />
      )}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Manage Route Permissions</h2>
            <button onClick={() => setEditingRoute({ route_path: '', role_ids: [] })} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Protect New Route</button>
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? <p className="text-center p-8">Loading routes...</p> :
            routes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route Path</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowed Roles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {routes.map((route) => (
                      <tr key={route.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{route.route_path}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {route.roles.length > 0 ? route.roles.map(r => r.name).join(', ') : <span className="text-yellow-600">No roles assigned (public)</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                          <button onClick={() => setEditingRoute(route)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                          <button onClick={() => handleDelete(route.route_path)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center p-8">No routes are protected yet.</p>
          }
        </div>
      </div>
    </>
  );
}

function DeveloperKit() {
  const [copied, setCopied] = useState(null);
  const [authProviderCode, setAuthProviderCode] = useState('Loading code...');
  const [canComponentCode, setCanComponentCode] = useState('Loading code...');

  useEffect(() => {
    const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    
    const getAuthProviderContent = (apiUrl) => `
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// This URL should point to your QR-Embed instance.
const API_HOST = process.env.NEXT_PUBLIC_QR_EMBED_URL || '${apiUrl}';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(\`\${API_HOST}/api/auth/me\`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const { user: userData, permissions: userPermissions } = await res.json();
        setUser(userData);
        setPermissions(userPermissions);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error("Failed to fetch user session:", error);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = async () => {
    await fetch(\`\${API_HOST}/api/auth/logout\`, { 
      method: 'POST', 
      credentials: 'include' 
    });
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (requiredPermission) => {
    return permissions.includes(requiredPermission);
  };

  const value = {
    user,
    permissions,
    isAuthenticated: !!user,
    loading,
    logout,
    hasPermission,
    fetchSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
    `.trim();

    const getCanComponentContent = () => `
import { useAuth } from './AuthProvider'; // Assuming it's in the same directory

/**
 * A component that renders its children only if the current user
 * has the required permission.
 *
 * @param {{
 *   permission: string;
 *   children: React.ReactNode;
 * }} props
 */
const Can = ({ permission, children }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
};

export default Can;
    `.trim();

    setAuthProviderCode(getAuthProviderContent(origin));
    setCanComponentCode(getCanComponentContent());
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getApiUrl = (path) => {
    const origin = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${origin}${path}`;
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900">Developer Integration Kit</h2>
        <p className="mt-2 text-sm text-gray-600">
          Integrate our powerful role-based access control into your own React application. Download the kit below, which includes the necessary files and a README with setup instructions.
        </p>
        <div className="mt-6">
          <a
            href={getApiUrl('/api/developer/download-kit')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Download Auth Kit (.zip)
          </a>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Manual Installation</h3>
        <p className="mt-2 text-sm text-gray-600">
          Alternatively, you can copy the files manually into your project.
        </p>
        <div className="mt-4 space-y-6">
          <div>
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">1. AuthProvider.js</h4>
              <button onClick={() => handleCopy(authProviderCode, 'provider')} className="text-sm text-indigo-600 hover:underline">{copied === 'provider' ? 'Copied!' : 'Copy Code'}</button>
            </div>
            <pre className="mt-2 bg-gray-100 p-4 rounded-md text-xs font-mono overflow-x-auto"><code>{authProviderCode}</code></pre>
          </div>
          <div>
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">2. Can.js</h4>
              <button onClick={() => handleCopy(canComponentCode, 'can')} className="text-sm text-indigo-600 hover:underline">{copied === 'can' ? 'Copied!' : 'Copy Code'}</button>
            </div>
            <pre className="mt-2 bg-gray-100 p-4 rounded-md text-xs font-mono overflow-x-auto"><code>{canComponentCode}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditRouteModal({ route, allRoles, onClose, onSave }) {
  const [routePath, setRoutePath] = useState(route.route_path);
  const [selectedRoleIds, setSelectedRoleIds] = useState(route.role_ids);
  const [isSaving, setIsSaving] = useState(false);
  const isNew = !route.id;

  const handleRoleChange = (roleId, isChecked) => {
    setSelectedRoleIds(prev => isChecked ? [...prev, roleId] : prev.filter(id => id !== roleId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({ route_path: routePath, role_ids: selectedRoleIds });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">{isNew ? 'Protect a New Route' : `Editing ${route.route_path}`}</h2>
          </div>
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div>
              <label htmlFor="route_path" className="block text-sm font-medium text-gray-700">Route Path</label>
              <input
                type="text"
                id="route_path"
                value={routePath}
                onChange={(e) => setRoutePath(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                placeholder="/admin/settings"
                required
                disabled={!isNew}
              />
              {!isNew && <p className="text-xs text-gray-500 mt-1">Route path cannot be changed after creation.</p>}
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Allowed Roles</h4>
              <p className="text-sm text-gray-500 mb-3">Select which roles can access this route. If no roles are selected, the route will be public.</p>
              <div className="space-y-2">
                {allRoles.map(role => (
                  <div key={role.id} className="relative flex items-start">
                    <div className="flex h-6 items-center">
                      <input
                        id={`route_role_${role.id}`}
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                      <label htmlFor={`route_role_${role.id}`} className="font-medium text-gray-900">{role.name}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end p-6 bg-gray-50 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving || !routePath.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserRolesModal({ user, allRoles, onClose, onSave }) {
  const [selectedRoleIds, setSelectedRoleIds] = useState(() => user.roles.map(r => r.id));
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleChange = (roleId, isChecked) => {
    setSelectedRoleIds(prev => isChecked ? [...prev, roleId] : prev.filter(id => id !== roleId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(user.id, selectedRoleIds);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Manage Roles for {user.email}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {allRoles.map(role => (
              <div key={role.id} className="relative flex items-start">
                <div className="flex h-6 items-center">
                  <input
                    id={`role_${role.id}`}
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor={`role_${role.id}`} className="font-medium text-gray-900">{role.name}</label>
                  <p className="text-gray-500">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end p-6 bg-gray-50 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateUserModal({ allRoles, onClose, onComplete }) {
  const [formData, setFormData] = useState({ email: '', password: '', roleIds: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (roleId, isChecked) => {
    setFormData(prev => {
      const newRoleIds = isChecked ? [...prev.roleIds, roleId] : prev.roleIds.filter(id => id !== roleId);
      return { ...prev, roleIds: newRoleIds };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user.');
      onComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900">Create New User</h2></div>
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {error && <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm">{error}</p>}
            <div><label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required /></div>
            <div><label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label><input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required /></div>
            <div><h4 className="text-md font-medium text-gray-800 mb-2">Assign Roles</h4><div className="space-y-2">{allRoles.map(role => (<div key={role.id} className="relative flex items-start"><div className="flex h-6 items-center"><input id={`create_role_${role.id}`} type="checkbox" checked={formData.roleIds.includes(role.id)} onChange={(e) => handleRoleChange(role.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor={`create_role_${role.id}`} className="font-medium text-gray-900">{role.name}</label></div></div>))}</div></div>
          </div>
          <div className="flex justify-end p-6 bg-gray-50 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSaving ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onComplete }) {
  const [formData, setFormData] = useState({ email: user.email, password: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = { userId: user.id, email: formData.email };
      if (formData.password) {
        payload.password = formData.password;
      }
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user.');
      onComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-900">Edit User: {user.email}</h2></div>
          <div className="p-6 space-y-6">
            {error && <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm">{error}</p>}
            <div><label htmlFor="edit_email" className="block text-sm font-medium text-gray-700">Email Address</label><input type="email" id="edit_email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required /></div>
            <div><label htmlFor="edit_password" className="block text-sm font-medium text-gray-700">New Password</label><input type="password" id="edit_password" name="password" value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Leave blank to keep current password" /></div>
          </div>
          <div className="flex justify-end p-6 bg-gray-50 rounded-b-lg space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSaving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Helper Components defined inside Dashboard ---
function EditRoleForm({ role, allPermissions, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: role.name || '',
    description: role.description || '',
    permissions: role.permissions || [],
  });
  const [isSaving, setIsSaving] = useState(false);

  const handlePermissionChange = (permissionId, isChecked) => {
    setFormData(prev => {
      const newPermissions = isChecked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId);
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-gray-50 border-t">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Edit Role: {role.name}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor={`role_name_${role.id}`} className="block text-sm font-medium text-gray-700">Role Name</label>
          <input type="text" id={`role_name_${role.id}`} name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor={`role_description_${role.id}`} className="block text-sm font-medium text-gray-700">Description</label>
          <input type="text" id={`role_description_${role.id}`} name="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </div>
      </div>
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-2">Permissions</h4>
        <div className="space-y-2">
          {allPermissions.map(permission => (
            <div key={permission.id} className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id={`perm_${role.id}_${permission.id}`}
                  name={permission.id}
                  type="checkbox"
                  checked={formData.permissions.includes(permission.id)}
                  onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor={`perm_${role.id}_${permission.id}`} className="font-medium text-gray-900">{permission.id}</label>
                <p className="text-gray-500">{permission.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function EditEmbedForm({ embed, allRoles, knownRoutes, onSave, onCancel }) {
  const isAuthComponent = ['qr_auth', 'mobile_otp', 'magic_link', 'social_login'].includes(embed.component_type) || !embed.component_type;

  const [formData, setFormData] = useState({
    success_url_a: embed.success_url_a || '',
    jwt_secret: embed.jwt_secret || '',
    role_id: embed.role_id || '',
    qrCodeEnabled: embed.qr_code_enabled || false,
    phoneOtpEnabled: embed.mobile_otp_enabled || false,
    magicLinkEnabled: embed.component_type === 'magic_link',
    credentials_enabled: embed.credentials_enabled || false,
    google_auth_enabled: embed.google_auth_enabled || false,
    github_auth_enabled: embed.github_auth_enabled || false,
    card_title: embed.card_title || '',
    card_price: embed.card_price || '',
    card_features: (embed.card_features || []).join('\n'),
    card_button_text: embed.card_button_text || 'Choose Plan',
    card_button_link: embed.card_button_link || '',
    card_badge: embed.card_badge || '',
    card_featured: embed.card_featured || false,
    contact_form_recipient_email: embed.contact_form_recipient_email || '',
    founder_name: embed.founder_name || '',
    founder_title: embed.founder_title || '',
    founder_bio: embed.founder_bio || '',
    founder_image_url: embed.founder_image_url || '',
    chatbot_welcome_message: embed.chatbot_welcome_message || '',
    chatbot_initial_questions: (embed.chatbot_initial_questions || []).join('\n'),
  });
  const [ssoEnabled, setSsoEnabled] = useState(!!embed.jwt_secret);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    let component_type = embed.component_type;
    if (isAuthComponent) {
      const isSocial = formData.google_auth_enabled || formData.github_auth_enabled;
      const isQr = formData.qrCodeEnabled;
      const isOtp = formData.phoneOtpEnabled;
      const isMagic = formData.magicLinkEnabled;
      const isCreds = formData.credentials_enabled;

      const isSocialOnly = isSocial && !isQr && !isOtp && !isMagic && !isCreds;
      const isOtpOnly = isOtp && !isSocial && !isQr && !isMagic && !isCreds;
      const isMagicOnly = isMagic && !isSocial && !isQr && !isOtp && !isCreds;

      if (isSocialOnly) {
        component_type = 'social_login';
      } else if (isOtpOnly) {
        component_type = 'mobile_otp';
      } else if (isMagicOnly) {
        component_type = 'magic_link';
      } else {
        component_type = 'qr_auth';
      }
    }

    const payload = {
      ...formData,
      component_type,
      jwt_secret: ssoEnabled ? formData.jwt_secret : '',
      role_id: formData.role_id || null,
      card_features: formData.card_features.split('\n').filter(f => f.trim() !== ''),
      chatbot_initial_questions: formData.chatbot_initial_questions.split('\n').filter(f => f.trim() !== ''),
    };
    
    await onSave(payload);
    setIsSaving(false);
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setFormData(prev => ({ ...prev, jwt_secret: secret }));
  };

  const copyEnvVar = () => {
    if (!formData.jwt_secret) return;
    const textToCopy = `JWT_VERIFICATION_KEY=${formData.jwt_secret}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isAuthComponent ? (
        <>
          {/* Auth form fields */}
        </>
      ) : embed.component_type === 'pricing_card' ? (
        <div>
          {/* Pricing card form fields */}
        </div>
      ) : embed.component_type === 'contact_form' ? (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Contact Form Configuration</h3>
          <div><label htmlFor="contact_form_recipient_email" className="block text-sm font-medium text-gray-700">Recipient Email</label><input type="email" id="contact_form_recipient_email" name="contact_form_recipient_email" value={formData.contact_form_recipient_email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="you@example.com" /></div>
        </div>
      ) : embed.component_type === 'founder_profile' ? (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Founder Profile Configuration</h3>
          <div className="space-y-4">
            <div><label htmlFor="founder_name">Name</label><input type="text" id="founder_name" name="founder_name" value={formData.founder_name} onChange={handleChange} /></div>
            <div><label htmlFor="founder_title">Title</label><input type="text" id="founder_title" name="founder_title" value={formData.founder_title} onChange={handleChange} /></div>
            <div><label htmlFor="founder_image_url">Image URL</label><input type="url" id="founder_image_url" name="founder_image_url" value={formData.founder_image_url} onChange={handleChange} /></div>
            <div><label htmlFor="founder_bio">Bio</label><textarea id="founder_bio" name="founder_bio" value={formData.founder_bio} onChange={handleChange} rows="3"></textarea></div>
          </div>
        </div>
      ) : embed.component_type === 'chatbot' ? (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Chatbot Configuration</h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800"><p><strong>Note:</strong> The chatbot requires an `OPENAI_API_KEY` to be set in your server's environment variables.</p></div>
          <div className="space-y-4 mt-4">
            <div><label htmlFor="chatbot_welcome_message">Welcome Message</label><input type="text" id="chatbot_welcome_message" name="chatbot_welcome_message" value={formData.chatbot_welcome_message} onChange={handleChange} /></div>
            <div><label htmlFor="chatbot_initial_questions">Initial Questions (one per line)</label><textarea id="chatbot_initial_questions" name="chatbot_initial_questions" value={formData.chatbot_initial_questions} onChange={handleChange} rows="3"></textarea></div>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end space-x-2 pt-2 border-t mt-6"><button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button><button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSaving ? 'Saving...' : 'Save Changes'}</button></div>
    </form>
  );
}
const StatusPill = ({ state }) => {
  const stateStyles = { init: "bg-blue-100 text-blue-800", loaded: "bg-yellow-100 text-yellow-800", scanned: "bg-orange-100 text-orange-800", verified: "bg-green-100 text-green-800", default: "bg-gray-100 text-gray-800" };
  const style = stateStyles[state] || stateStyles.default;
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>{state}</span>;
};
function SessionList({ sessions }) {
  if (sessions.length === 0) return <p className="text-center text-gray-500 py-4">No sessions for this embed yet.</p>;
  return (<div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-100"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">{sessions.map((session) => (<tr key={session.token}><td className="px-4 py-3 whitespace-nowrap"><StatusPill state={session.state} /></td><td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(session.created_at).toLocaleString()}</td><td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500"><div className="flex flex-col space-y-1"><p>Token: <code className="text-xs bg-gray-100 p-1 rounded">{session.token.substring(0, 8)}...</code></p>{session.fingerprint && <p>Device FP: <code className="text-xs bg-gray-100 p-1 rounded">{session.fingerprint.substring(0, 8)}...</code></p>}{session.mobile_fingerprint && <p>Mobile FP: <code className="text-xs bg-gray-100 p-1 rounded">{session.mobile_fingerprint.substring(0, 8)}...</code></p>}</div></td></tr>))}</tbody></table></div>);
}
const CheckIcon = () => (<div className="flex justify-center"><svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>);
const getEmbedCategory = (embed) => {
  const authTypes = ['qr_auth', 'mobile_otp', 'magic_link', 'social_login'];
  if (authTypes.includes(embed.component_type) || !embed.component_type) return 'Auth';
  if (embed.component_type === 'pricing_card') return 'Payment';
  if (embed.component_type === 'contact_form') return 'Form';
  if (embed.component_type === 'founder_profile') return 'Content';
  if (embed.component_type === 'chatbot') return 'AI';
  return 'Other';
};

function Dashboard() {
  const [dashboardTab, setDashboardTab] = useState('embeds');
  const { user, logout, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
          <div className="flex items-center space-x-4">
            {!loading && user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Logged in as: <span className="font-medium">{user.user.name || user.user.email}</span>
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Log Out
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setDashboardTab('embeds')}
              className={`${dashboardTab === 'embeds' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Embeds
            </button>
            <button
              onClick={() => setDashboardTab('apps')}
              className={`${dashboardTab === 'apps' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Apps
            </button>
            <button
              onClick={() => setDashboardTab('roles')}
              className={`${dashboardTab === 'roles' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Roles & Permissions
            </button>
            <button
              onClick={() => setDashboardTab('users')}
              className={`${dashboardTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Users
            </button>
            <button
              onClick={() => setDashboardTab('routes')}
              className={`${dashboardTab === 'routes' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Route Permissions
            </button>
            <button
              onClick={() => setDashboardTab('developer')}
              className={`${dashboardTab === 'developer' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Developer Kit
            </button>
            <button
              onClick={() => setDashboardTab('wizard')}
              className={`${dashboardTab === 'wizard' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              App Wizard
            </button>
          </nav>
        </div>

        <div style={{ display: dashboardTab === 'embeds' ? 'block' : 'none' }}><EmbedManagement /></div>
        <div style={{ display: dashboardTab === 'apps' ? 'block' : 'none' }}><AppManagement /></div>
        <div style={{ display: dashboardTab === 'roles' ? 'block' : 'none' }}><RoleManagement /></div>
        <div style={{ display: dashboardTab === 'users' ? 'block' : 'none' }}><UserManagement /></div>
        <div style={{ display: dashboardTab === 'routes' ? 'block' : 'none' }}><RouteManagement /></div>
        <div style={{ display: dashboardTab === 'developer' ? 'block' : 'none' }}><DeveloperKit /></div>
        <div style={{ display: dashboardTab === 'wizard' ? 'block' : 'none' }}><AppWizard /></div>
      </main>
    </div>
  );
}

export default Dashboard;