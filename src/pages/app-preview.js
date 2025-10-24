import { useState, useEffect } from 'react';
import Head from 'next/head';

// --- Mock Components to simulate the generated app ---

const MockHeader = ({ config }) => {
  const { appName, features, branding } = config;
  const logoUrl = branding?.logoUrl || '';

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-8">
            <a href="#" className="flex items-center space-x-2 text-xl font-bold text-gray-900">
              {logoUrl && <img src={logoUrl} alt={`${appName} logo`} className="h-8 w-auto" />}
              <span>{appName}</span>
            </a>
            <div className="space-x-4">
              {features?.payments && <a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Pricing</a>}
              {(config.customPages || []).map(page => (
                <a key={page.id} href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600">{page.name}</a>
              ))}
            </div>
          </div>
          <div className="space-x-4 flex items-center">
            <a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Login</a>
          </div>
        </div>
      </nav>
    </header>
  );
};

const MockFooter = ({ config }) => {
  const copyrightText = config.branding?.copyrightText || '';
  const socials = config.branding?.socials || {};
  const legal = config.branding?.legal || {};

  return (
    <footer className="bg-white">
      <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex space-x-6">
            {socials.twitter && <a href="#" className="text-gray-400 hover:text-gray-500">Twitter</a>}
            {socials.github && <a href="#" className="text-gray-400 hover:text-gray-500">GitHub</a>}
          </div>
          <div className="flex space-x-4 text-sm text-gray-500">
            {legal.privacy && <a href="#" className="hover:text-gray-600">Privacy Policy</a>}
            {legal.terms && <a href="#" className="hover:text-gray-600">Terms of Service</a>}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-gray-400">{copyrightText}</p>
      </div>
    </footer>
  );
};

const MockLandingPage = ({ config }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
      Welcome to {config.appName}
    </h1>
    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
      This is your brand new application, ready to go.
    </p>
  </div>
);

// --- Main Preview Page Component ---

export default function AppPreviewPage() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handleMessage = (event) => {
      // Basic security check
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data.type === 'QREMBED_APP_PREVIEW_UPDATE') {
        setConfig(event.data.config);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent that the iframe is ready to receive config
    window.parent.postMessage({ type: 'QREMBED_APP_PREVIEW_READY' }, window.location.origin);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-500">Waiting for configuration...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>App Preview</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MockHeader config={config} />
        <main className="flex-grow">
          {config.features?.landingPage ? <MockLandingPage config={config} /> : (
            <div className="text-center py-16 text-gray-500">Landing page is disabled.</div>
          )}
        </main>
        <MockFooter config={config} />
      </div>
    </>
  );
}