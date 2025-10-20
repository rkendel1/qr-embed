import jwt from 'jsonwebtoken';

// This is a mock of a user database lookup.
const findUserById = async (userId) => {
  console.log(`[SSO Demo] Looking up user with ID: ${userId}`);
  // In a real app, you would query your database:
  // e.g., return await db.users.findUnique({ where: { id: userId } });
  if (userId) {
    return { id: userId, name: 'Demo User', email: `user-${userId}@example.com` };
  }
  return null;
};

// This is a mock of creating a user session (e.g., setting a cookie).
const createSessionForUser = async (res, user) => {
  console.log(`[SSO Demo] Creating session for user: ${user.id}`);
  // In a real app, you would use a library like `iron-session` or `next-auth`
  // to create a secure, httpOnly session cookie.
  // For this demo, we'll just log it.
  return;
};

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Authentication token is missing.');
  }

  // IMPORTANT: The client must get this secret from YOUR dashboard for the specific embed.
  // For this demo, we'll have to find a way to look it up.
  // In a real scenario, the client would hardcode the one you give them.
  // Let's assume for the demo the secret is 'default-secret-for-demo'.
  // A better demo would decode the token first (without verifying) to get an embed_id,
  // then look up the secret for that embed. But let's keep it simple for now.
  
  // NOTE: We can't easily get the right secret here in a demo.
  // We will just log that we would verify it.
  console.log(`[SSO Demo] Received token. In a real app, we would verify this against the client's secret.`);
  
  // For the purpose of this demo, we will skip verification and pretend it succeeded.
  // In a real implementation, the following code would be inside the `try` block of jwt.verify.
  
  try {
    // In a real app, you would uncomment this and use the real secret:
    // const jwtSecret = process.env.THEIR_CONFIGURED_JWT_SECRET;
    // const payload = jwt.verify(token, jwtSecret);
    // const { userId } = payload;

    // --- DEMO ONLY ---
    // We'll decode without verifying to get the userId for the demo flow.
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.userId) {
      throw new Error("Invalid token structure.");
    }
    const { userId } = decoded;
    // --- END DEMO ONLY ---

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).send('User not found.');
    }

    await createSessionForUser(res, user);

    // On success, we send a 200 OK. The client-side script will handle the redirect.
    res.status(200).json({ success: true, userId: user.id });

  } catch (error) {
    console.error('[SSO Demo] Verification failed:', error.message);
    return res.status(401).send('Invalid or expired authentication token.');
  }
}