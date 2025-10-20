import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';

// This is a mock of a user database lookup.
const findUserById = async (userId) => {
  console.log(`[SSO Demo] Looking up user with ID: ${userId}`);
  if (userId) {
    return { id: userId, name: 'Demo User', email: `user-${userId}@example.com` };
  }
  return null;
};

// This function now creates a real (but simple) session cookie.
const createSessionForUser = async (res, user) => {
  console.log(`[SSO Demo] Creating session for user: ${user.id}`);
  const cookie = serialize('demo-auth', JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
  });
  res.setHeader('Set-Cookie', cookie);
};

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Authentication token is missing.');
  }
  
  try {
    // First, decode without verification to get the embedId
    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.embedId) {
      throw new Error("Invalid token: missing embedId.");
    }

    // Look up the embed to get the secret
    const { data: embed, error: embedError } = await supabaseAdmin
      .from('embeds')
      .select('jwt_secret')
      .eq('id', decodedPayload.embedId)
      .single();

    if (embedError || !embed || !embed.jwt_secret) {
      console.error(`[SSO Demo] Could not find secret for embed ${decodedPayload.embedId}`, embedError);
      throw new Error("Could not verify token source.");
    }

    // Now, verify the token with the correct secret
    const decoded = jwt.verify(token, embed.jwt_secret);
    
    if (!decoded || !decoded.userId) {
      throw new Error("Invalid token structure after verification.");
    }
    const { userId } = decoded;

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    await createSessionForUser(res, user);

    res.status(200).json({ success: true, userId: user.id });

  } catch (error) {
    console.error('[SSO Demo] Verification failed:', error.message);
    return res.status(401).send('Invalid or expired authentication token.');
  }
}