import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const errorMessage = "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Cannot perform admin actions.";
    console.error(errorMessage);
    return res.status(500).json({ error: errorMessage });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, success_url_a, success_url_b, active_path } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Embed ID is required.' });
  }

  if (active_path && !['A', 'B'].includes(active_path)) {
    return res.status(400).json({ error: 'Invalid active path.' });
  }

  const { data, error } = await supabaseAdmin
    .from('embeds')
    .update({ success_url_a, success_url_b, active_path })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase error updating embed:', error);
    return res.status(500).json({ error: 'Failed to update embed.' });
  }

  res.status(200).json(data);
}