import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';

// This is a mock of a user database lookup.
const findUserById = async (userId) => {
  if (userId) {
    return { id: userId, name: 'Demo User', email: `user-${userId}@example.com` };
  }
  return null;
};

// This function creates the session cookie.
const createSessionForUser = (res, user) => {
  const cookie = serialize('demo-auth', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
    sameSite: 'lax',
  });
  res.setHeader('Set-Cookie', cookie);
};

export default async function handler(req, res) {
  const { token, redirectUrl } = req.query;

  if (!token || !redirectUrl) {
    return res.status(400).send('Token and redirectUrl are required.');
  }

  try {
    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.embedId) {
      throw new Error("Invalid token: missing embedId.");
    }

    const { data: embed, error: embedError } = await supabaseAdmin
      .from('embeds')
      .select('jwt_secret')
      .eq('id', decodedPayload.embedId)
      .single();

    if (embedError || !embed || !embed.jwt_secret) {
      console.error(`[SSO Login] Could not find secret for embed ${decodedPayload.embedId}`, embedError);
      throw new Error("Could not verify token source.");
    }

    const decoded = jwt.verify(token, embed.jwt_secret);
    
    if (!decoded || !decoded.userId) {
      throw new Error("Invalid token structure after verification.");
    }
    const { userId } = decoded;

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    createSessionForUser(res, user);

    // Forcefully redirect to the final destination after setting the cookie.
    res.writeHead(302, { Location: redirectUrl });
    res.end();

  } catch (error) {
    console.error('[SSO Login] Verification failed:', error.message);
    return res.status(401).send('Invalid or expired authentication token.');
  }
}