import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, success_url_a, success_url_b, active_path, routing_rule, jwt_secret } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Embed ID is required.' });
  }

  if (active_path && !['A', 'B'].includes(active_path)) {
    return res.status(400).json({ error: 'Invalid active path.' });
  }

  if (routing_rule && !['none', 'device_parity', 'split_test'].includes(routing_rule)) {
    return res.status(400).json({ error: 'Invalid routing rule.' });
  }

  const updateData = {
    success_url_a: success_url_a !== undefined ? success_url_a.trim() : undefined,
    success_url_b: success_url_b !== undefined ? success_url_b.trim() : undefined,
    active_path,
    routing_rule,
    jwt_secret,
  };
  
  // Remove undefined keys so we only update provided fields
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  const { data, error } = await supabaseAdmin
    .from('embeds')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase error updating embed:', error);
    return res.status(500).json({ error: 'Failed to update embed.' });
  }

  res.status(200).json(data);
}