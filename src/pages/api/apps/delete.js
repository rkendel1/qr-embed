import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { appId } = req.body;

  if (!appId) {
    return res.status(400).json({ error: 'App ID is required.' });
  }

  try {
    // Deleting an app will set app_id to NULL in embeds due to ON DELETE SET NULL
    const { error } = await supabaseAdmin
      .from('apps')
      .delete()
      .eq('id', appId);

    if (error) throw error;

    res.status(200).json({ message: 'App deleted successfully.' });
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app.' });
  }
}