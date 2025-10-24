import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { routes } = req.body;

  if (!Array.isArray(routes) || routes.length === 0) {
    return res.status(400).json({ error: 'An array of routes is required.' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('known_routes')
      .upsert(routes, { onConflict: 'path' });

    if (error) throw error;

    res.status(200).json({ message: 'Known routes have been updated.' });
  } catch (error) {
    console.error('Error upserting known routes:', error);
    res.status(500).json({ error: 'Failed to update known routes.' });
  }
}