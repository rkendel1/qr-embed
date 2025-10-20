import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Mock user lookup
const findUserById = async (userId) => {
  if (userId) {
    return { id: userId, name: 'Authenticated User', email: `user-${userId}@example.com` };
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const token = cookies['auth-token'];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.embedId) {
      throw new Error("Invalid token: missing embedId.");
    }

    const { data: embed } = await supabaseAdmin
      .from('embeds')
      .select('jwt_secret')
      .eq('id', decodedPayload.embedId)
      .single();

    if (!embed || !embed.jwt_secret) {
      throw new Error("Could not verify token source.");
    }

    const { userId } = jwt.verify(token, embed.jwt_secret);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("[/api/auth/me] Auth error:", error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}