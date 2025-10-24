import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing.' });
  }

  // In a real app, you'd validate the 'state' parameter here against the one
  // stored in the user's session to prevent CSRF attacks.

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const { 
      stripe_user_id: stripe_account_id, 
      access_token, 
      refresh_token,
      scope,
    } = response;

    if (!stripe_account_id) {
      throw new Error('Stripe account ID was not returned.');
    }

    // Save the connection details to the database.
    // Using upsert is helpful for handling re-connections.
    const { error } = await supabaseAdmin
      .from('stripe_connections')
      .upsert({
        stripe_account_id,
        access_token,
        refresh_token,
        scope,
      }, {
        onConflict: 'stripe_account_id'
      });

    if (error) {
      console.error('Supabase error saving Stripe connection:', error);
      throw new Error('Failed to save Stripe connection details.');
    }

    // Redirect the user back to the dashboard.
    res.redirect(302, '/dashboard');

  } catch (error) {
    console.error('Stripe OAuth callback error:', error.message);
    res.status(500).send(`An error occurred during Stripe connection: ${error.message}`);
  }
}