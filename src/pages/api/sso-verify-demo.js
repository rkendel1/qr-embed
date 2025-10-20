import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

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
  
  console.log(`[SSO Demo] Received token. In a real app, we would verify this against the client's secret.`);
  
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.userId) {
      throw new Error("Invalid token structure.");
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