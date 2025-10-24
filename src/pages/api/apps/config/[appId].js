import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  const { appId } = req.query;

  if (!appId) {
    return res.status(400).json({ error: 'App ID is required.' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabaseAdmin
        .from('app_configurations')
        .select('config')
        .eq('app_id', appId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // "Not a single row was found"
          return res.status(404).json({ error: 'No configuration found for this app.' });
        }
        throw error;
      }

      res.status(200).json(data.config);
    } catch (error) {
      console.error('Error fetching app configuration:', error);
      res.status(500).json({ error: 'Failed to fetch app configuration.' });
    }
  } else if (req.method === 'POST') {
    try {
      const config = req.body;
      
      const { data, error } = await supabaseAdmin
        .from('app_configurations')
        .upsert({
          app_id: appId,
          config: config,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'app_id' })
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({ message: 'Configuration saved successfully.', data });
    } catch (error) {
      console.error('Error saving app configuration:', error);
      res.status(500).json({ error: 'Failed to save app configuration.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}