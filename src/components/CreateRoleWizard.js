import { useState, useEffect } from 'react';

export default function CreateRoleWizard({ isOpen, onClose, onComplete }) {
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] });
  const [allPermissions, setAllPermissions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchPermissions = async () => {
        try {
          const res = await fetch('/api/permissions/list');
          if (!res.ok) throw new Error('Failed to fetch permissions');
          const data = await res.json();
          setAllPermissions(data);
        } catch (err) {
          setError(err.message);
        }
      };
      fetchPermissions();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permissionId, isChecked) => {
    setFormData(prev => {
      const newPermissions = isChecked
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId);
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/roles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create role');
      }
      onComplete();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', permissions: [] });
    setError(null);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Create New Role</h2>
          </div>
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {error && <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Role Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., Editor"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Describe what this role can do..."
                />
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-2">Permissions</h4>
              <div className="space-y-2">
                {allPermissions.length > 0 ? allPermissions.map(permission => (
                  <div key={permission.id} className="relative flex items-start">
                    <div className="flex h-6 items-center">
                      <input
                        id={`perm_create_${permission.id}`}
                        name={permission.id}
                        type="checkbox"
                        checked={formData.permissions.includes(permission.id)}
                        onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                      <label htmlFor={`perm_create_${permission.id}`} className="font-medium text-gray-900">{permission.id}</label>
                      <p className="text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-gray-500">Loading permissions...</p>}
              </div>
            </div>
          </div>
          <div className="flex justify-end p-6 bg-gray-50 rounded-b-lg space-x-3">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSaving || !formData.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
              {isSaving ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}