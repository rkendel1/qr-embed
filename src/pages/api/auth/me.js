import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper to flatten and unique permissions from multiple roles
const getPermissionsFromRoles = (roles) => {
  const permissions = new Set();
  if (roles) {
    for (const role of roles) {
      if (role.roles && role.roles.permissions) {
        for (const permission of role.roles.permissions) {
          permissions.add(permission);
        }
      }
    }
  }
  return Array.from(permissions);
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
    
    // Fetch user and their roles with permissions in one go
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        external_user_id,
        email,
        onboarding_completed_at,
        created_at,
        user_roles (
          roles (
            name,
            permissions
          )
        )
      `)
      .eq('external_user_id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = getPermissionsFromRoles(user.user_roles);

    res.status(200).json({
      user: {
        id: user.external_user_id,
        email: user.email,
        name: user.email, // Using email as name for now
        onboardingCompletedAt: user.onboarding_completed_at,
        createdAt: user.created_at,
        roles: user.user_roles.map(r => r.roles.name),
      },
      permissions,
    });

  } catch (error) {
    console.error("[/api/auth/me] Auth error:", error.message);
    // Clear the invalid cookie to prevent login loops
    res.setHeader('Set-Cookie', 'auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}