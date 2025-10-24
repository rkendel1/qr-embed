import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from 'jsonwebtoken';

const makeAbsoluteUrl = (url, origin) => {
  if (!url || !origin || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  try {
    return new URL(url, origin).toString();
  } catch (e) {
    console.warn(`[makeAbsoluteUrl] Could not create absolute URL for: ${url} with origin: ${origin}`);
    return url;
  }
};

async function getGoogleAccessToken(code, redirect_uri) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get Google access token.');
  return data.access_token;
}

async function getGoogleUserProfile(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Failed to get Google user profile.');
  return {
    id: data.id,
    email: data.email,
    name: data.name,
  };
}

async function getGithubAccessToken(code, redirect_uri) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error_description || 'Failed to get GitHub access token.');
  return data.access_token;
}

async function getGithubUserProfile(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to get GitHub user profile.');
  return {
    id: data.id.toString(),
    email: data.email, // Note: may be null if private
    name: data.name || data.login,
  };
}

export default async function handler(req, res) {
  const { code, state, provider } = req.query;

  if (!code || !state || !provider) {
    return res.status(400).send('Missing required parameters.');
  }

  if (!process.env.OTP_JWT_SECRET) {
    console.error("[Social Callback] CRITICAL: OTP_JWT_SECRET is not set.");
    return res.status(500).send("Authentication failed: Server configuration error.");
  }

  try {
    const { token: embedToken, origin: clientOrigin } = jwt.verify(state, process.env.OTP_JWT_SECRET);
    
    const { data: embed } = await supabaseAdmin
      .from('embeds')
      .select('id, success_url_a, jwt_secret, roles(name)')
      .eq('template_token', embedToken)
      .single();

    if (!embed) {
      throw new Error('Embed configuration not found.');
    }

    const redirect_uri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/callback/${provider}`;
    let userProfile;

    if (provider === 'google') {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error("[Social Callback] CRITICAL: Google OAuth credentials are not set.");
        throw new Error("Google login is not configured on the server.");
      }
      const accessToken = await getGoogleAccessToken(code, redirect_uri);
      userProfile = await getGoogleUserProfile(accessToken);
    } else if (provider === 'github') {
      if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        console.error("[Social Callback] CRITICAL: GitHub OAuth credentials are not set.");
        throw new Error("GitHub login is not configured on the server.");
      }
      const accessToken = await getGithubAccessToken(code, redirect_uri);
      userProfile = await getGithubUserProfile(accessToken);
    } else {
      throw new Error('Unsupported provider.');
    }

    const externalUserId = `${provider}-${userProfile.id}`;

    // JIT Provisioning
    await supabaseAdmin.from('users').upsert({ external_user_id: externalUserId }, { onConflict: 'external_user_id' });

    const userRole = embed.roles?.name || 'user';
    let destinationUrl = embed.success_url_a || (userRole === 'admin' ? '/admin-dashboard' : '/user-dashboard');
    destinationUrl = makeAbsoluteUrl(destinationUrl, clientOrigin);
    
    let finalSuccessUrl = destinationUrl;

    if (embed.jwt_secret) {
      const authToken = jwt.sign(
        { userId: externalUserId, embedId: embed.id, role: userRole },
        embed.jwt_secret,
        { expiresIn: '1d' }
      );
      
      const loginUrl = new URL('/api/auth/login', process.env.NEXT_PUBLIC_APP_URL);
      loginUrl.searchParams.set('token', authToken);
      loginUrl.searchParams.set('redirectUrl', destinationUrl);
      finalSuccessUrl = loginUrl.toString();
    }

    res.redirect(307, finalSuccessUrl);

  } catch (error) {
    console.error(`[Social Callback Error - ${provider}]`, error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
}