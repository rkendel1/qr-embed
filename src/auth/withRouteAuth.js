import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

// A cache to store route permissions to reduce database lookups
const permissionsCache = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

async function getUserRoles(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('roles(id)')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
  return data.map(item => item.roles.id);
}

async function getRoutePermissions(routePath) {
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_DURATION && permissionsCache.has(routePath)) {
    return permissionsCache.get(routePath);
  }

  // If cache is stale, refresh it
  if (now - cacheTimestamp >= CACHE_DURATION) {
    permissionsCache.clear();
    const { data: allRules } = await supabaseAdmin.from('route_permissions').select('route_path, role_ids');
    if (allRules) {
      allRules.forEach(rule => permissionsCache.set(rule.route_path, rule.role_ids));
    }
    cacheTimestamp = now;
  }
  
  return permissionsCache.get(routePath);
}

export const withRouteAuth = (getServerSidePropsFunc) => {
  return async (context) => {
    const { req, resolvedUrl } = context;
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
    const token = cookies['auth-token'];

    if (!token) {
      return { redirect: { destination: '/', permanent: false } };
    }

    try {
      // 1. Decode token to get user ID
      const { userId } = jwt.decode(token);
      if (!userId) throw new Error('Invalid token payload');

      // 2. Fetch user's roles
      const userRoles = await getUserRoles(userId);

      // 3. Fetch required roles for the route
      const requiredRoles = await getRoutePermissions(resolvedUrl);

      // 4. If no roles are required for this route, access is allowed
      if (!requiredRoles || requiredRoles.length === 0) {
        if (getServerSidePropsFunc) {
          return await getServerSidePropsFunc(context);
        }
        return { props: {} };
      }

      // 5. Check if user has at least one of the required roles
      const hasPermission = userRoles.some(userRole => requiredRoles.includes(userRole));

      if (!hasPermission) {
        return { redirect: { destination: '/unauthorized', permanent: false } };
      }

      // 6. User is authorized, proceed with original getServerSideProps
      if (getServerSidePropsFunc) {
        return await getServerSidePropsFunc(context);
      }

      return { props: {} };

    } catch (error) {
      console.error(`[withRouteAuth] Error on ${resolvedUrl}:`, error.message);
      return { redirect: { destination: '/', permanent: false } };
    }
  };
};