import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update({ state: 'scanned', scanned_at: new Date().toISOString() })
    .eq('token', token)
    .in('state', ['init', 'loaded']) // Only update if in a valid previous state
    .select()
    .single();

  if (error) {
    console.error('Supabase error updating session to scanned:', error);
    return res.status(500).json({ error: 'Failed to update session.' });
  }

  if (!data) {
    return res.status(200).json({ message: 'No update needed or session not found.' });
  }

  res.status(200).json(data);
}