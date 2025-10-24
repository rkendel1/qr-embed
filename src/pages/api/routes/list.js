import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    // Fetch all route permissions and all roles in parallel
    const [routesRes, rolesRes] = await Promise.all([
      supabaseAdmin.from('route_permissions').select('*').order('route_path', { ascending: true }),
      supabaseAdmin.from('roles').select('id, name')
    ]);

    if (routesRes.error) throw routesRes.error;
    if (rolesRes.error) throw rolesRes.error;

    const allRoutes = routesRes.data || [];
    const allRoles = rolesRes.data || [];

    // Create a lookup map for roles
    const rolesMap = new Map(allRoles.map(role => [role.id, role]));

    // Map the role IDs to role objects for each route
    const formattedData = allRoutes.map(route => ({
      ...route,
      roles: (route.role_ids || []).map(roleId => rolesMap.get(roleId)).filter(Boolean)
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching route permissions:', error);
    res.status(500).json({ error: 'Failed to fetch route permissions.' });
  }
}