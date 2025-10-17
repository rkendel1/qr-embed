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

  const { id, is_active } = req.body;

  if (!id || typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'Embed ID and active status are required.' });
  }

  const { data, error } = await supabaseAdmin
    .from('embeds')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase error toggling embed:', error);
    return res.status(500).json({ error: 'Failed to update embed.' });
  }

  res.status(200).json(data);
}