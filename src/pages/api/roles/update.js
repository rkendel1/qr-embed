import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, name, description, permissions } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Role ID is required.' });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (permissions !== undefined) updateData.permissions = permissions;

  if (Object.keys(updateData).length === 0) {
    return res.status(200).json({ message: 'No changes detected.' });
  }

  const { data, error } = await supabaseAdmin
    .from('roles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase error updating role:', error);
    return res.status(500).json({ error: 'Failed to update role.' });
  }

  res.status(200).json(data);
}