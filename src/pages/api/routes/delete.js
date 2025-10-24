import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { route_path } = req.body;

  if (!route_path) {
    return res.status(400).json({ error: 'Route path is required.' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('route_permissions')
      .delete()
      .eq('route_path', route_path);

    if (error) throw error;

    res.status(200).json({ message: 'Route permission deleted successfully.' });
  } catch (error) {
    console.error('Error deleting route permission:', error);
    res.status(500).json({ error: 'Failed to delete route permission.' });
  }
}