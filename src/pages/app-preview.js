import { useState, useEffect, useId } from 'react';
import Head from 'next/head';

// --- Live Embed Loader ---
const LiveEmbedLoader = ({ token }) => {
  const targetId = useId();
  const apiHost = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!token || !apiHost) return;

    const container = document.getElementById(targetId);
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = `${apiHost}/embed.js`;
    script.defer = true;
    script.dataset.token = token;
    script.dataset.host = apiHost;
    script.dataset.targetId = targetId;

    container.appendChild(script);

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
      // Also remove any chatbot elements that might be attached to the body
      const fab = document.getElementById('chatbot-fab');
      const window = document.getElementById('chatbot-window');
      if (fab) fab.remove();
      if (window) window.remove();
    };
  }, [token, apiHost, targetId]);

  return <div id={targetId} className="flex items-center justify-center min-h-[300px]"></div>;
};


// --- Mock Page Components ---
const MockHeader = ({ config, setCurrentPage }) => {
  const { appName, features, branding, customPages } = config;
  const logoUrl = branding?.logoUrl || '';

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-8">
            <button onClick={() => setCurrentPage('home')} className="flex items-center space-x-2 text-xl font-bold text-gray-900">
              {logoUrl && <img src={logoUrl} alt={`${appName} logo`} className="h-8 w-auto" />}
              <span>{appName}</span>
            </button>
            <div className="space-x-4">
              {features?.payments && <button onClick={() => setCurrentPage('pricing')} className="text-sm font-medium text-gray-700 hover:text-indigo-600">Pricing</button>}
              {(customPages || []).map(page => (
                <button key={page.id} onClick={() => setCurrentPage(page.path)} className="text-sm font-medium text-gray-700 hover:text-indigo-600">{page.name}</button>
              ))}
              <button onClick={() => setCurrentPage('component-library')} className="text-sm font-medium text-gray-700 hover:text-indigo-600">Component Library</button>
            </div>
          </div>
          <div className="space-x-4 flex items-center">
            {features?.authPage && <button onClick={() => setCurrentPage('/login')} className="text-sm font-medium text-gray-700 hover:text-indigo-600">Login</button>}
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
            {socials.twitter && <a href="#" onClick={e => e.preventDefault()} className="text-gray-400 hover:text-gray-500">Twitter</a>}
            {socials.github && <a href="#" onClick={e => e.preventDefault()} className="text-gray-400 hover:text-gray-500">GitHub</a>}
          </div>
          <div className="flex space-x-4 text-sm text-gray-500">
            {legal.privacy && <button onClick={() => setCurrentPage('/privacy')} className="hover:text-gray-600">Privacy Policy</button>}
            {legal.terms && <button onClick={() => setCurrentPage('/terms')} className="hover:text-gray-600">Terms of Service</button>}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-gray-400">{copyrightText}</p>
      </div>
    </footer>
  );
};

const MockLandingPage = ({ config }) => (
  <div className="text-center">
    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
      Welcome to {config.appName}
    </h1>
    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
      This is your brand new application, ready to go.
    </p>
  </div>
);

const MockPage = ({ title, path, children }) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="mb-8 text-center">
      <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
      {path && <p className="text-gray-500 font-mono text-sm mt-1"><code>{path}</code></p>}
    </div>
    {children}
  </div>
);

// --- Main Preview Page Component ---
export default function AppPreviewPage() {
  const [config, setConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'QREMBED_APP_PREVIEW_UPDATE') {
        setConfig(event.data.config);
      }
    };
    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'QREMBED_APP_PREVIEW_READY' }, window.location.origin);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-500">Waiting for configuration...</p>
      </div>
    );
  }

  const renderCurrentPage = () => {
    // Landing Page
    if (currentPage === 'home') {
      return (
        <MockPage title="Landing Page" path="/">
          {config.features?.landingPage ? <MockLandingPage config={config} /> : <div className="text-center py-16 text-gray-500">Landing page is disabled.</div>}
        </MockPage>
      );
    }
    // Login Page
    if (currentPage === '/login' && config.features?.authPage) {
      return (
        <MockPage title="Login Page" path="/login">
          <div className="flex justify-center">
            <LiveEmbedLoader token={config.selectedAuthEmbed} />
          </div>
        </MockPage>
      );
    }
    // Pricing Page
    if (currentPage === 'pricing' && config.features?.payments) {
      return (
        <MockPage title="Pricing Page" path="/pricing">
          <div className="flex flex-wrap justify-center items-start gap-8">
            {(config.selectedPaymentEmbeds || []).map(token => <LiveEmbedLoader key={token} token={token} />)}
          </div>
        </MockPage>
      );
    }
    // Component Library
    if (currentPage === 'component-library') {
      return (
        <MockPage title="Component Library">
          <p className="text-center text-gray-500 mb-8">A preview of all available embeds.</p>
          <div className="space-y-12 flex flex-col items-center">
            {(config.allEmbeds || []).map(embed => (
              <div key={embed.id} className="w-full max-w-md">
                <h4 className="text-lg font-semibold text-center mb-4 text-gray-700">{embed.name}</h4>
                <div className="p-4 border border-dashed rounded-lg bg-white shadow-sm">
                  <LiveEmbedLoader token={embed.template_token} />
                </div>
              </div>
            ))}
          </div>
        </MockPage>
      );
    }
    // Custom Pages
    const customPage = (config.customPages || []).find(p => p.path === currentPage);
    if (customPage) {
      return (
        <MockPage title={customPage.name} path={customPage.path}>
          <div className="mt-8 space-y-8 flex flex-col items-center">
            {(customPage.embeds || []).map(token => <LiveEmbedLoader key={token} token={token} />)}
          </div>
        </MockPage>
      );
    }

    // Fallback to home
    return (
      <MockPage title="Landing Page" path="/">
        <MockLandingPage config={config} />
      </MockPage>
    );
  };

  return (
    <>
      <Head>
        <title>App Preview</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MockHeader config={config} setCurrentPage={setCurrentPage} />
        <main className="flex-grow">
          {renderCurrentPage()}
        </main>
        <MockFooter config={config} />
      </div>
    </>
  );
}