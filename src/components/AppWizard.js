import { useState, useEffect, useCallback, useRef } from 'react';

export default function AppWizard({ isActive }) {
  const [appName, setAppName] = useState('my-awesome-app');
  const [port, setPort] = useState(3000);
  const [features, setFeatures] = useState({
    landingPage: true,
    authPage: true,
    dashboard: true,
    adminDashboard: false,
    onboarding: false,
    payments: false,
  });
  const [onboardingSteps, setOnboardingSteps] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [error, setError] = useState(null);
  
  const [allEmbeds, setAllEmbeds] = useState([]);
  const [authEmbeds, setAuthEmbeds] = useState([]);
  const [paymentEmbeds, setPaymentEmbeds] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [allApps, setAllApps] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedAuthEmbed, setSelectedAuthEmbed] = useState('');
  const [selectedPaymentEmbeds, setSelectedPaymentEmbeds] = useState([]);
  
  const [routePermissions, setRoutePermissions] = useState({
    dashboard: [],
    admin: [],
    onboarding: [],
  });

  const [customPages, setCustomPages] = useState([]);
  const [branding, setBranding] = useState({
    logoUrl: '',
    copyrightText: `© ${new Date().getFullYear()} ${appName}`,
    socials: { twitter: '', github: '' },
    legal: { privacy: false, terms: false },
  });

  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef(null);

  const currentConfig = { appName, port, features, onboardingSteps, selectedAuthEmbed, selectedPaymentEmbeds, routePermissions, customPages, branding, allEmbeds };

  // Effect to send updates to the iframe
  useEffect(() => {
    if (showPreview && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'QREMBED_APP_PREVIEW_UPDATE',
        config: currentConfig
      }, window.location.origin);
    }
  }, [currentConfig, showPreview]);

  // Effect to listen for the iframe being ready
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'QREMBED_APP_PREVIEW_READY' && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'QREMBED_APP_PREVIEW_UPDATE',
          config: currentConfig
        }, window.location.origin);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentConfig]);


  useEffect(() => {
    setBranding(prev => ({ ...prev, copyrightText: `© ${new Date().getFullYear()} ${appName}` }));
  }, [appName]);

  const fetchData = useCallback(async () => {
    if (!isActive) return;

    setLoading(true);
    setError(null);
    try {
      const [embedsRes, rolesRes, appsRes] = await Promise.all([
        fetch('/api/embed/list'),
        fetch('/api/roles/list'),
        fetch('/api/apps/list'),
      ]);
      if (!embedsRes.ok || !rolesRes.ok || !appsRes.ok) throw new Error('Failed to fetch initial data');
      
      const embedsData = await embedsRes.json();
      const rolesData = await rolesRes.json();
      const appsData = await appsRes.json();
      
      setAllEmbeds(embedsData);
      setAllRoles(rolesData);
      setAllApps(appsData);

      const auth = embedsData.filter(e => ['qr_auth', 'mobile_otp', 'magic_link', 'social_login'].includes(e.component_type) || !e.component_type);
      const payment = embedsData.filter(e => e.component_type === 'pricing_card');
      
      setAuthEmbeds(auth);
      setPaymentEmbeds(payment);

      if (auth.length > 0 && (!selectedAuthEmbed || !auth.find(e => e.template_token === selectedAuthEmbed))) {
        setSelectedAuthEmbed(auth[0].template_token);
      }

    } catch (err) {
      console.error("Failed to load data for wizard:", err);
      setError("Could not load necessary data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [isActive, selectedAuthEmbed]);

  useEffect(() => {
    fetchData();

    window.addEventListener('focus', fetchData);
    return () => {
      window.removeEventListener('focus', fetchData);
    };
  }, [isActive, fetchData]);

  useEffect(() => {
    if (!selectedAppId) return;

    const loadConfig = async () => {
      try {
        const res = await fetch(`/api/apps/config/${selectedAppId}`);
        if (res.status === 404) {
          console.log("No config found for this app. Using current wizard state.");
          const selectedApp = allApps.find(app => app.id === selectedAppId);
          if (selectedApp) {
            setAppName(selectedApp.name.toLowerCase().replace(/\s+/g, '-'));
          }
          return;
        }
        if (!res.ok) throw new Error('Failed to load app configuration.');
        
        const config = await res.json();
        
        setAppName(config.appName || 'my-awesome-app');
        setPort(config.port || 3000);
        setFeatures(config.features || { landingPage: true, authPage: true, dashboard: true, adminDashboard: false, onboarding: false, payments: false });
        setOnboardingSteps(config.onboardingSteps || 3);
        setSelectedAuthEmbed(config.selectedAuthEmbed || (authEmbeds.length > 0 ? authEmbeds[0].template_token : ''));
        setSelectedPaymentEmbeds(config.selectedPaymentEmbeds || []);
        setRoutePermissions(config.routePermissions || { dashboard: [], admin: [], onboarding: [] });
        setCustomPages(config.customPages || []);
        setBranding(config.branding || { logoUrl: '', copyrightText: `© ${new Date().getFullYear()} ${config.appName || 'my-awesome-app'}`, socials: { twitter: '', github: '' }, legal: { privacy: false, terms: false } });

      } catch (err) {
        setError(err.message);
      }
    };

    loadConfig();
  }, [selectedAppId, allApps, authEmbeds]);

  const handleFeatureChange = (e) => {
    const { name, checked } = e.target;
    setFeatures(prev => ({ ...prev, [name]: checked }));
  };

  const handleBrandingChange = (e) => {
    const { name, value } = e.target;
    setBranding(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setBranding(prev => ({ ...prev, socials: { ...prev.socials, [name]: value } }));
  };

  const handleLegalChange = (e) => {
    const { name, checked } = e.target;
    setBranding(prev => ({ ...prev, legal: { ...prev.legal, [name]: checked } }));
  };

  const handlePaymentEmbedChange = (token, isChecked) => {
    setSelectedPaymentEmbeds(prev => {
      if (isChecked) {
        return [...prev, token];
      } else {
        return prev.filter(t => t !== token);
      }
    });
  };

  const handlePermissionChange = (route, roleId) => {
    setRoutePermissions(prev => {
      const currentRoles = prev[route] || [];
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter(id => id !== roleId)
        : [...currentRoles, roleId];
      return { ...prev, [route]: newRoles };
    });
  };

  const addCustomPage = () => {
    setCustomPages(prev => [...prev, { id: Date.now(), name: '', path: '', isProtected: false, roles: [], embeds: [] }]);
  };

  const updateCustomPage = (id, field, value) => {
    setCustomPages(prev => prev.map(page => {
      if (page.id !== id) return page;
      const newPage = { ...page, [field]: value };
      if (field === 'path') {
        if (!newPage.path.startsWith('/')) newPage.path = '/' + newPage.path;
        // This regex was causing the build error. It has been simplified.
        newPage.path = newPage.path.replace(/[^-a-z0-9/]/g, '');
      }
      if (field === 'isProtected' && !value) newPage.roles = [];
      return newPage;
    }));
  };

  const updateCustomPageRoles = (id, roleId) => {
    setCustomPages(prev => prev.map(page => {
      if (page.id !== id) return page;
      const currentRoles = page.roles || [];
      const newRoles = currentRoles.includes(roleId)
        ? currentRoles.filter(rId => rId !== roleId)
        : [...currentRoles, roleId];
      return { ...page, roles: newRoles };
    }));
  };

  const updateCustomPageEmbeds = (id, embedToken) => {
    setCustomPages(prev => prev.map(page => {
      if (page.id !== id) return page;
      const currentEmbeds = page.embeds || [];
      const newEmbeds = currentEmbeds.includes(embedToken)
        ? currentEmbeds.filter(e => e !== embedToken)
        : [...currentEmbeds, embedToken];
      return { ...page, embeds: newEmbeds };
    }));
  };

  const removeCustomPage = (id) => {
    setCustomPages(prev => prev.filter(page => page.id !== id));
  };

  const saveConfiguration = async () => {
    if (!selectedAppId) {
      setError("Please select an app to save the configuration.");
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return false;
    }

    setSaveStatus('saving');
    setError(null);
    
    try {
      const res = await fetch(`/api/apps/config/${selectedAppId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentConfig),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save configuration.');
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      return true;

    } catch (err) {
      setError(err.message);
      setSaveStatus('error');
      return false;
    }
  };

  const handleSaveConfiguration = async () => {
    await saveConfiguration();
  };

  const handleGenerate = async () => {
    const saved = await saveConfiguration();
    if (!saved) return;

    setIsGenerating(true);
    setError(null);
    try {
      const allSelectedTokens = [
        currentConfig.selectedAuthEmbed,
        ...currentConfig.selectedPaymentEmbeds,
        ...currentConfig.customPages.flatMap(p => p.embeds || [])
      ].filter(Boolean);

      const uniqueTokens = [...new Set(allSelectedTokens)];
      const usesChatbot = uniqueTokens.some(token => {
          const embed = allEmbeds.find(e => e.template_token === token);
          return embed && embed.component_type === 'chatbot';
      });

      const res = await fetch('/api/wizard/generate-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...currentConfig,
          embedToken: currentConfig.selectedAuthEmbed,
          paymentEmbedTokens: currentConfig.selectedPaymentEmbeds,
          usesChatbot: usesChatbot,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to generate app.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${appName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveButtonText = {
    idle: 'Save Configuration',
    saving: 'Saving...',
    saved: 'Saved!',
    error: 'Save Configuration',
  };

  return (
    <div className="relative">
      {/* Preview Panel (Overlay) */}
      <div className={`fixed top-0 right-0 h-full w-full md:w-4/5 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-20 ${showPreview ? 'translate-x-0' : 'translate-x-full'}`}>
        {showPreview && (
          <div className="flex flex-col h-full">
            <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b">
              <span className="text-sm font-semibold text-gray-700">Live App Preview</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-grow">
              <iframe
                ref={iframeRef}
                src="/app-preview"
                title="App Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Config Panel */}
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Application Wizard</h2>
              <p className="mt-2 text-sm text-gray-600">
                Configure and generate your application. Click the button to open a live preview.
              </p>
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Open Live Preview
            </button>
          </div>
          <div className="mt-4">
            <label htmlFor="appSelector" className="block text-sm font-medium text-gray-700">Select App</label>
            <select id="appSelector" value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} className="mt-1 block w-full max-w-md pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="">-- Select an app to configure --</option>
              {allApps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
            <div className="space-y-8">
              {/* Step 1: App Name */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">1. Basic Configuration</h3>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="appName" className="block text-sm font-medium text-gray-700">App Name</label>
                    <input
                      type="text"
                      id="appName"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value.replace(/[^a-z0-9-]/g, ''))}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="port" className="block text-sm font-medium text-gray-700">Development Port</label>
                    <input
                      type="number"
                      id="port"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">2. Standard Pages & Features</h3>
                <div className="mt-4 space-y-4">
                  <FeatureToggle name="landingPage" label="Landing Page" description="A public-facing marketing page for your app." features={features} onChange={handleFeatureChange} />
                  
                  <div>
                    <FeatureToggle name="authPage" label="Authentication Page" description="A dedicated page for users to sign in." features={features} onChange={handleFeatureChange} />
                    {features.authPage && (
                      <div className="pl-9 mt-2">
                        <label htmlFor="embedSelector" className="block text-sm font-medium text-gray-700">Select Auth Embed</label>
                        <select id="embedSelector" value={selectedAuthEmbed} onChange={(e) => setSelectedAuthEmbed(e.target.value)} className="mt-1 block w-full max-w-md pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" disabled={loading || authEmbeds.length === 0}>
                          {loading ? <option>Loading...</option> : authEmbeds.length > 0 ? authEmbeds.map(embed => <option key={embed.id} value={embed.template_token}>{embed.name}</option>) : <option>No auth embeds found</option>}
                        </select>
                      </div>
                    )}
                  </div>

                  <FeatureToggle name="dashboard" label="User Dashboard" description="A protected page that only logged-in users can see." features={features} onChange={handleFeatureChange} />
                  <FeatureToggle name="adminDashboard" label="Admin Dashboard" description="A protected page for administrators." features={features} onChange={handleFeatureChange} />
                  
                  <div>
                    <FeatureToggle name="onboarding" label="Onboarding Flow" description="A multi-step process for new users after they sign up." features={features} onChange={handleFeatureChange} />
                    {features.onboarding && (
                      <div className="pl-9 mt-2">
                        <label htmlFor="onboardingSteps" className="block text-sm font-medium text-gray-700">Number of Steps</label>
                        <input type="number" id="onboardingSteps" value={onboardingSteps} onChange={(e) => setOnboardingSteps(e.target.value)} min="1" max="10" className="mt-1 block w-24 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                      </div>
                    )}
                  </div>

                  <div>
                    <FeatureToggle name="payments" label="Payments & Subscriptions" description="Display pricing cards from your payment embeds." features={features} onChange={handleFeatureChange} />
                    {features.payments && (
                      <div className="pl-9 mt-2">
                        <label className="block text-sm font-medium text-gray-700">Select Payment Embeds</label>
                        <div className="mt-2 space-y-2 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto bg-white">
                          {loading ? (
                            <p className="text-sm text-gray-500">Loading...</p>
                          ) : paymentEmbeds.length > 0 ? (
                            paymentEmbeds.map(embed => (
                              <div key={embed.id} className="relative flex items-start">
                                <div className="flex h-6 items-center">
                                  <input
                                    id={`payment-embed-${embed.id}`}
                                    name={embed.template_token}
                                    type="checkbox"
                                    checked={selectedPaymentEmbeds.includes(embed.template_token)}
                                    onChange={(e) => handlePaymentEmbedChange(embed.template_token, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                  />
                                </div>
                                <div className="ml-3 text-sm leading-6">
                                  <label htmlFor={`payment-embed-${embed.id}`} className="font-medium text-gray-900">{embed.name}</label>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No payment embeds found. Create one in the 'Embeds' tab.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Custom Pages */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">3. Custom Pages</h3>
                <div className="mt-4 space-y-4">
                  {customPages.map((page, index) => (
                    <div key={page.id} className="p-4 border rounded-md bg-gray-50/50 relative">
                      <button type="button" onClick={() => removeCustomPage(page.id)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">&times;</button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={`page_name_${page.id}`} className="block text-sm font-medium text-gray-700">Page Name</label>
                          <input type="text" id={`page_name_${page.id}`} value={page.name} onChange={(e) => updateCustomPage(page.id, 'name', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., About Us" />
                        </div>
                        <div>
                          <label htmlFor={`page_path_${page.id}`} className="block text-sm font-medium text-gray-700">Page Path</label>
                          <input type="text" id={`page_path_${page.id}`} value={page.path} onChange={(e) => updateCustomPage(page.id, 'path', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="/about-us" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="relative flex items-start">
                          <div className="flex h-6 items-center"><input id={`page_protected_${page.id}`} type="checkbox" checked={page.isProtected} onChange={(e) => updateCustomPage(page.id, 'isProtected', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div>
                          <div className="ml-3 text-sm leading-6"><label htmlFor={`page_protected_${page.id}`} className="font-medium text-gray-900">Protect this page (requires login)</label></div>
                        </div>
                      </div>
                      {page.isProtected && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-800 text-sm">Allowed Roles</h4>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                            {allRoles.length > 0 ? allRoles.map(role => (
                              <div key={role.id} className="relative flex items-start">
                                <div className="flex h-6 items-center"><input id={`custom_page_${page.id}_role_${role.id}`} type="checkbox" checked={(page.roles || []).includes(role.id)} onChange={() => updateCustomPageRoles(page.id, role.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div>
                                <div className="ml-2 text-sm leading-6"><label htmlFor={`custom_page_${page.id}_role_${role.id}`} className="font-medium text-gray-900">{role.name}</label></div>
                              </div>
                            )) : <p className="text-sm text-gray-500">No roles found.</p>}
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-800 text-sm">Embeds on this page</h4>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border border-gray-200 rounded-md p-3 max-h-32 overflow-y-auto bg-white">
                          {allEmbeds.length > 0 ? allEmbeds.map(embed => (
                            <div key={embed.id} className="relative flex items-start">
                              <div className="flex h-6 items-center"><input id={`custom_page_${page.id}_embed_${embed.id}`} type="checkbox" checked={(page.embeds || []).includes(embed.template_token)} onChange={() => updateCustomPageEmbeds(page.id, embed.template_token)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div>
                              <div className="ml-2 text-sm leading-6"><label htmlFor={`custom_page_${page.id}_embed_${embed.id}`} className="font-medium text-gray-900">{embed.name}</label></div>
                            </div>
                          )) : <p className="text-sm text-gray-500 col-span-2">No embeds found.</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addCustomPage} className="w-full text-center px-4 py-2 border border-dashed border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">+ Add Custom Page</button>
                </div>
              </div>

              {/* Step 4: Branding & Footer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">4. Branding & Footer</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">Logo URL</label>
                    <input type="text" name="logoUrl" id="logoUrl" value={branding.logoUrl} onChange={handleBrandingChange} className="mt-1 block w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="https://example.com/logo.png" />
                    <p className="mt-2 text-xs text-gray-500">
                      You can use any image format (PNG, JPG, SVG). If you need to upload your logo, you can use a free service like <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Imgur</a> and then paste the direct image link here.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="copyrightText" className="block text-sm font-medium text-gray-700">Copyright Text</label>
                    <input type="text" name="copyrightText" id="copyrightText" value={branding.copyrightText} onChange={handleBrandingChange} className="mt-1 block w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Social Links</h4>
                    <div className="mt-2 space-y-2">
                      <input type="url" name="twitter" value={branding.socials.twitter} onChange={handleSocialChange} className="block w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Twitter URL" />
                      <input type="url" name="github" value={branding.socials.github} onChange={handleSocialChange} className="block w-full max-w-md px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="GitHub URL" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Legal Pages</h4>
                    <div className="mt-2 space-y-2">
                      <FeatureToggle name="privacy" label="Include Privacy Policy" description="Generates a /privacy page with placeholder content." features={branding.legal} onChange={handleLegalChange} />
                      <FeatureToggle name="terms" label="Include Terms of Service" description="Generates a /terms page with placeholder content." features={branding.legal} onChange={handleLegalChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5: Route Protection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">5. Access Control for Standard Pages</h3>
                <p className="text-sm text-gray-500 mt-4">Choose which roles can access the protected pages. These rules will be automatically created for you.</p>
                <div className="mt-4 space-y-4">
                  {features.dashboard && <RoleSelector title="User Dashboard (/dashboard)" route="dashboard" allRoles={allRoles} selectedRoles={routePermissions.dashboard} onChange={handlePermissionChange} />}
                  {features.adminDashboard && <RoleSelector title="Admin Dashboard (/admin)" route="admin" allRoles={allRoles} selectedRoles={routePermissions.admin} onChange={handlePermissionChange} />}
                  {features.onboarding && <RoleSelector title="Onboarding Flow (/onboarding/*)" route="onboarding" allRoles={allRoles} selectedRoles={routePermissions.onboarding} onChange={handlePermissionChange} />}
                </div>
              </div>

              {error && <p className="text-red-500 bg-red-50 p-3 rounded-md text-sm">{error}</p>}

              <div className="pt-6 border-t flex items-center space-x-4">
                <button onClick={handleGenerate} disabled={isGenerating || loading} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400">
                  {isGenerating ? 'Generating...' : 'Generate & Download App'}
                </button>
                <button 
                  onClick={handleSaveConfiguration} 
                  disabled={saveStatus === 'saving' || loading} 
                  className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 ${saveStatus === 'saved' ? 'bg-green-100 text-green-800' : ''}`}
                >
                  {saveButtonText[saveStatus]}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureToggle({ name, label, description, features, onChange, disabled = false }) {
  return (
    <div className={`relative flex items-start ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex h-6 items-center">
        <input id={name} name={name} type="checkbox" checked={features[name]} onChange={onChange} disabled={disabled} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
      </div>
      <div className="ml-3 text-sm leading-6">
        <label htmlFor={name} className={`font-medium ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>{label}</label>
        <p className="text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function RoleSelector({ title, route, allRoles, selectedRoles, onChange }) {
  return (
    <div className="p-4 border rounded-md">
      <h4 className="font-medium text-gray-800">{title}</h4>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {allRoles.length > 0 ? allRoles.map(role => (
          <div key={role.id} className="relative flex items-start">
            <div className="flex h-6 items-center">
              <input id={`${route}-${role.id}`} type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => onChange(route, role.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
            </div>
            <div className="ml-2 text-sm leading-6">
              <label htmlFor={`${route}-${role.id}`} className="font-medium text-gray-900">{role.name}</label>
            </div>
          </div>
        )) : <p className="text-sm text-gray-500">No roles found. Create roles in the 'Roles & Permissions' tab.</p>}
      </div>
    </div>
  );
}