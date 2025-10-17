import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, is_active } = req.body;

  if (!id || typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'Embed ID and active status are required.' });
  }

  const { data, error } = await supabase
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