import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { features, onboardingSteps, customPages, routePermissions, branding } = req.body;

    // --- Save Known Routes ---
    const generatedRoutes = [];
    if (features.landingPage) generatedRoutes.push({ path: '/', description: 'Landing Page' });
    if (features.authPage) generatedRoutes.push({ path: '/login', description: 'Login Page' });
    if (features.dashboard) generatedRoutes.push({ path: '/dashboard', description: 'User Dashboard' });
    if (features.adminDashboard) generatedRoutes.push({ path: '/admin', description: 'Admin Dashboard' });
    if (features.payments) generatedRoutes.push({ path: '/pricing', description: 'Pricing Page' });
    if (features.onboarding) {
      for (let i = 1; i <= onboardingSteps; i++) {
        generatedRoutes.push({ path: `/onboarding/step-${i}`, description: `Onboarding Step ${i}` });
      }
    }
    if (customPages && customPages.length > 0) {
      generatedRoutes.push(...customPages.map(p => ({ path: p.path, description: p.name })));
    }
    if (branding.legal.privacy) generatedRoutes.push({ path: '/privacy', description: 'Privacy Policy' });
    if (branding.legal.terms) generatedRoutes.push({ path: '/terms', description: 'Terms of Service' });

    if (generatedRoutes.length > 0) {
      const { error } = await supabaseAdmin.from('known_routes').upsert(generatedRoutes, { onConflict: 'path' });
      if (error) throw error;
    }

    // --- Save Route Permissions ---
    const routesToProtect = [];
    if (features.dashboard && routePermissions.dashboard?.length > 0) {
      routesToProtect.push({ route_path: '/dashboard', role_ids: routePermissions.dashboard });
    }
    if (features.adminDashboard && routePermissions.admin?.length > 0) {
      routesToProtect.push({ route_path: '/admin', role_ids: routePermissions.admin });
    }
    if (features.onboarding && onboardingSteps > 0 && routePermissions.onboarding?.length > 0) {
      for (let i = 1; i <= onboardingSteps; i++) {
        routesToProtect.push({ route_path: `/onboarding/step-${i}`, role_ids: routePermissions.onboarding });
      }
    }
    if (customPages && customPages.length > 0) {
      routesToProtect.push(
        ...customPages
          .filter(p => p.isProtected && p.roles.length > 0)
          .map(p => ({ route_path: p.path, role_ids: p.roles }))
      );
    }

    if (routesToProtect.length > 0) {
      const { error } = await supabaseAdmin.from('route_permissions').upsert(routesToProtect, { onConflict: 'route_path' });
      if (error) throw error;
    }

    res.status(200).json({ message: 'Configuration saved successfully.' });

  } catch (error) {
    console.error('Failed to save app configuration:', error);
    res.status(500).json({ error: 'Could not save the application configuration.' });
  }
}