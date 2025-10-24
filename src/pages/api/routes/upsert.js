import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { route_path, role_ids } = req.body;

  if (!route_path || !Array.isArray(role_ids)) {
    return res.status(400).json({ error: 'Route path and an array of role IDs are required.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('route_permissions')
      .upsert({ route_path, role_ids }, { onConflict: 'route_path' })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error upserting route permission:', error);
    res.status(500).json({ error: 'Failed to save route permission.' });
  }
}