import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  // We'll use a random state value to prevent CSRF attacks.
  const state = randomBytes(16).toString('hex');
  // In a real app, you'd save this state in the user's session.
  // For this demo, we'll proceed without session-based validation.

  const host = req.headers.host;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  // IMPORTANT: This redirect URI must be added to your Stripe application's settings
  // under "Settings > Connect > Settings"
  const redirect_uri = `${appUrl}/api/stripe-oauth-callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CLIENT_ID,
    scope: 'read_only', // Request read-only access, which is safer.
    redirect_uri: redirect_uri,
    state: state,
  });

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  
  res.redirect(302, url);
}