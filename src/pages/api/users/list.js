import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    // Fetch users and their related roles in a single query
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        external_user_id,
        created_at,
        roles (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(users || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}