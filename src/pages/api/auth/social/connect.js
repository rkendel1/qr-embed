import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { provider, token, origin } = req.query;

  if (!provider || !token) {
    return res.status(400).json({ error: 'Provider and token are required.' });
  }

  if (!process.env.OTP_JWT_SECRET) {
    console.error("[Social Connect] CRITICAL: OTP_JWT_SECRET is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  // Use a short-lived JWT as the state parameter to prevent CSRF and pass the embed token and origin.
  const state = jwt.sign({ token, origin }, process.env.OTP_JWT_SECRET, { expiresIn: '10m' });
  const redirect_uri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/callback/${provider}`;

  let authorizationUrl;

  if (provider === 'google') {
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("[Social Connect] CRITICAL: GOOGLE_CLIENT_ID is not set.");
      return res.status(500).json({ error: "Google login is not configured." });
    }
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });
    authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  } else if (provider === 'github') {
    if (!process.env.GITHUB_CLIENT_ID) {
      console.error("[Social Connect] CRITICAL: GITHUB_CLIENT_ID is not set.");
      return res.status(500).json({ error: "GitHub login is not configured." });
    }
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri,
      scope: 'read:user user:email',
      state,
    });
    authorizationUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  } else {
    return res.status(400).json({ error: 'Unsupported provider.' });
  }

  res.redirect(302, authorizationUrl);
}