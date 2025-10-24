import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { token, redirectUrl } = req.query;

  if (!token || !redirectUrl) {
    return res.status(400).json({ error: 'Missing token or redirect URL.' });
  }

  try {
    // First, decode the token to get the embedId without verifying
    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.embedId) {
      throw new Error("Invalid token payload.");
    }

    // Fetch the embed's secret key from the database
    const { data: embed } = await supabaseAdmin
      .from('embeds')
      .select('jwt_secret')
      .eq('id', decodedPayload.embedId)
      .single();

    if (!embed || !embed.jwt_secret) {
      throw new Error("Could not find secret to verify token.");
    }

    // Now, verify the token with the correct secret
    jwt.verify(token, embed.jwt_secret);

    // If verification is successful, set the cookie
    const cookie = serialize('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
    });

    res.setHeader('Set-Cookie', cookie);

    // Redirect to the final destination
    res.redirect(307, redirectUrl);

  } catch (error) {
    console.error("[/api/auth/login] Error:", error.message);
    return res.status(401).send('Authentication failed: Invalid or expired token.');
  }
}