import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, roleIds } = req.body;

  if (!userId || !Array.isArray(roleIds)) {
    return res.status(400).json({ error: 'User ID and an array of role IDs are required.' });
  }

  try {
    // This is a two-step process: delete old roles, then insert new ones.
    // In a production app, you might wrap this in a database transaction (RPC call).

    // 1. Delete all existing role assignments for the user
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    // 2. Insert the new role assignments if any are provided
    if (roleIds.length > 0) {
      const rolesToInsert = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert(rolesToInsert);

      if (insertError) {
        throw insertError;
      }
    }

    res.status(200).json({ message: 'User roles updated successfully.' });

  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Failed to update user roles.' });
  }
}