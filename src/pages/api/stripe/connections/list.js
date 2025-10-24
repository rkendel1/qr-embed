import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_connections')
      .select('stripe_account_id');

    if (error) {
      throw error;
    }

    res.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching Stripe connections:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe connections.' });
  }
}