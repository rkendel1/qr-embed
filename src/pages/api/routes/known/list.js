import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('known_routes')
      .select('path')
      .order('path', { ascending: true });

    if (error) throw error;

    res.status(200).json(data.map(r => r.path) || []);
  } catch (error) {
    console.error('Error fetching known routes:', error);
    res.status(500).json({ error: 'Failed to fetch known routes.' });
  }
}