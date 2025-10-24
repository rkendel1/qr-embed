import JSZip from 'jszip';
import { getFileContentTemplates } from '@/lib/app-wizard-templates';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { appName, port, features, embedToken, onboardingSteps, paymentEmbedTokens, routePermissions, customPages, branding, usesChatbot } = req.body;
    const origin = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;

    const templates = getFileContentTemplates(appName, origin, features, embedToken, onboardingSteps, paymentEmbedTokens, customPages, branding, port, usesChatbot);
    const zip = new JSZip();

    // Root files
    zip.file('jsconfig.json', templates.jsconfig);
    zip.file('package.json', templates.packageJson);
    zip.file('README.md', templates.readme);
    zip.file('.env.local.example', templates.envExample);
    zip.file('env.txt', templates.envExample); // Add the visible .txt version
    zip.file('next.config.mjs', templates.nextConfig);
    zip.file('postcss.config.mjs', templates.postcssConfig);
    zip.file('tailwind.config.js', templates.tailwindConfig);

    const srcFolder = zip.folder('src');
    srcFolder.folder('auth').file('AuthProvider.js', templates.authProvider).file('Can.js', templates.canComponent).file('withAuth.js', templates.withAuth);
    srcFolder.folder('components').file('Header.js', templates.headerComponent).file('EmbedLoader.js', templates.embedLoaderComponent).file('Footer.js', templates.footerComponent);
    srcFolder.folder('styles').file('globals.css', templates.globalsCss);
    
    const pagesFolder = srcFolder.folder('pages');
    pagesFolder.file('_app.js', templates.appJs);
    if (features.landingPage) pagesFolder.file('index.js', templates.landingPage);
    if (features.authPage) pagesFolder.file('login.js', templates.loginPage);
    if (features.dashboard) pagesFolder.file('dashboard.js', templates.dashboardPage);
    if (features.adminDashboard) pagesFolder.file('admin.js', templates.adminPage);
    if (features.payments) pagesFolder.file('pricing.js', templates.pricingPage);
    if (branding.legal.privacy) pagesFolder.file('privacy.js', templates.privacyPage);
    if (branding.legal.terms) pagesFolder.file('terms.js', templates.termsPage);
    
    if (features.onboarding && onboardingSteps > 0) {
      const onboardingFolder = pagesFolder.folder('onboarding');
      for (let i = 1; i <= onboardingSteps; i++) {
        onboardingFolder.file(`step-${i}.js`, templates.getOnboardingStep(i, onboardingSteps));
      }
    }

    if (customPages && customPages.length > 0) {
      for (const page of customPages) {
        if (page.path && page.name) {
          const safePath = page.path.replace(/^\/+/, '').replace(/\.\./g, '');
          pagesFolder.file(`${safePath}.js`, templates.getCustomPage(page, appName));
        }
      }
    }

    // --- Automate Route Protection ---
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
      if (error) {
        console.error('Failed to auto-configure route permissions:', error);
        // We don't block the download, but we log the error.
      }
    }
    // --- End Route Protection ---

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${appName}.zip`);
    res.send(content);

  } catch (error) {
    console.error('Failed to generate app:', error);
    res.status(500).json({ error: 'Could not generate the application zip file.' });
  }
}