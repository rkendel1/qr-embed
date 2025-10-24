// A static list of permissions available in the system.
// In a more complex system, this could come from a database table.
const permissions = [
  // Project Permissions
  { id: 'project:create', description: 'Can create new projects.' },
  { id: 'project:edit', description: 'Can edit existing projects.' },
  { id: 'project:view', description: 'Can view projects.' },
  { id: 'project:delete', description: 'Can delete projects.' },

  // User Management Permissions
  { id: 'user:manage', description: 'Can manage users and their roles (full access).' },
  { id: 'user:invite', description: 'Can invite new users.' },
  { id: 'user:view', description: 'Can view user profiles.' },
  { id: 'user:edit-roles', description: 'Can change user roles.' },

  // Customer Data Permissions
  { id: 'customer:create', description: 'Can create new customers.' },
  { id: 'customer:edit', description: 'Can edit customer details.' },
  { id: 'customer:view', description: 'Can view customer information.' },
  { id: 'customer:delete', description: 'Can delete customers.' },
];

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }
  res.status(200).json(permissions);
}