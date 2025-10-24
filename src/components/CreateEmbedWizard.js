import { useState, useEffect } from 'react';
import Link from 'next/link';
import EmbedPreview from './EmbedPreview';

const WizardStep = ({ currentStep, stepNumber, title }) => {
  const isActive = currentStep === stepNumber;
  const isCompleted = currentStep > stepNumber;
  
  return (
    <div className="flex items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted ? 'bg-indigo-600 text-white' : isActive ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
        {isCompleted ? '✓' : stepNumber}
      </div>
      <div className={`ml-3 text-sm font-medium ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'}`}>{title}</div>
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <div className="flex items-center">
    <span className="text-sm font-medium text-gray-600 w-28 flex-shrink-0">{label}:</span>
    <span className="text-sm text-gray-900 font-medium truncate">{value}</span>
  </div>
);

const formatComponentType = (type) => {
  switch (type) {
    case 'qr_auth': return 'QR Auth';
    case 'pricing_card': return 'Pricing Card';
    case 'mobile_otp': return 'Mobile OTP';
    case 'magic_link': return 'Magic Link';
    case 'social_login': return 'Social Login';
    case 'contact_form': return 'Contact Form';
    case 'founder_profile': return 'Founder Profile';
    case 'chatbot': return 'Chatbot';
    default: return 'Unknown';
  }
};

const EnvVarBlock = ({ lines }) => {
  const textToCopy = lines.join('\n');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 bg-gray-100 p-3 rounded-md border border-gray-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Add to your .env.local file</p>
        <button type="button" onClick={handleCopy} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="mt-2 bg-gray-200 p-2 rounded-md">
        <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
          <code>{textToCopy}</code>
        </pre>
      </div>
    </div>
  );
};

export default function CreateEmbedWizard({ isOpen, onClose, onComplete, allRoles, allApps }) {
  const [step, setStep] = useState(1);
  const [flowType, setFlowType] = useState(null);
  
  const initialFormData = {
    name: '',
    app_id: '',
    component_type: 'qr_auth',
    success_url_a: '',
    jwt_secret: '',
    role_id: '',
    qrCodeEnabled: true,
    phoneOtpEnabled: false,
    magicLinkEnabled: false,
    credentials_enabled: false,
    google_auth_enabled: false,
    github_auth_enabled: false,
    cardTitle: '',
    cardPrice: '',
    cardFeatures: '',
    cardButtonText: 'Choose Plan',
    cardButtonLink: '',
    cardBadge: '',
    cardFeatured: false,
    contact_form_recipient_email: '',
    founder_name: '',
    founder_title: '',
    founder_bio: '',
    founder_image_url: '',
    chatbot_welcome_message: 'Hello! How can I help you today?',
    chatbot_initial_questions: 'What is this product?\nHow do I get started?',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [configMode, setConfigMode] = useState('choice');
  const [isEnterpriseOpen, setIsEnterpriseOpen] = useState(false);
  const [knownRoutes, setKnownRoutes] = useState([]);

  const atLeastOneAuthMethodSelected = 
    formData.qrCodeEnabled || 
    formData.phoneOtpEnabled || 
    formData.magicLinkEnabled || 
    formData.credentials_enabled || 
    formData.google_auth_enabled || 
    formData.github_auth_enabled;

  useEffect(() => {
    if (isOpen) {
      fetch('/api/routes/known/list')
        .then(res => res.json())
        .then(data => setKnownRoutes(data))
        .catch(err => console.error("Failed to fetch known routes:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && flowType === 'payment' && step === 2) {
      setLoadingConnections(true);
      fetch('/api/stripe/connections/list')
        .then(res => res.json())
        .then(data => {
          setConnections(data || []);
          if (data && data.length > 0) {
            setConfigMode('stripe');
          } else {
            setConfigMode('choice');
          }
        })
        .catch(err => {
          console.error("Failed to fetch Stripe connections:", err);
          setConfigMode('choice');
        })
        .finally(() => setLoadingConnections(false));
    }
  }, [isOpen, step, flowType]);

  const handleAuthMethodChange = (e) => {
    const { name, checked } = e.target;
    
    setFormData(prev => {
      const newState = { ...prev, [name]: checked };
      const { google_auth_enabled, github_auth_enabled, qrCodeEnabled, phoneOtpEnabled, magicLinkEnabled, credentials_enabled } = newState;
      const isSocial = google_auth_enabled || github_auth_enabled;
      
      if (isSocial && !qrCodeEnabled && !phoneOtpEnabled && !magicLinkEnabled && !credentials_enabled) newState.component_type = 'social_login';
      else if (phoneOtpEnabled && !isSocial && !qrCodeEnabled && !magicLinkEnabled && !credentials_enabled) newState.component_type = 'mobile_otp';
      else if (magicLinkEnabled && !isSocial && !qrCodeEnabled && !phoneOtpEnabled && !credentials_enabled) newState.component_type = 'magic_link';
      else newState.component_type = 'qr_auth';
      
      return newState;
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    setFormData(prev => ({ ...prev, jwt_secret: secret }));
  };

  const handleNext = () => setStep(s => s + 1);
  
  const handleBack = () => {
    if (step === 2) setFlowType(null);
    setStep(s => s - 1);
  };

  const handleSelectFlow = (type) => {
    setFlowType(type);
    const componentMap = {
      auth: 'qr_auth',
      payment: 'pricing_card',
      contact: 'contact_form',
      profile: 'founder_profile',
      chatbot: 'chatbot',
    };
    setFormData(prev => ({ ...prev, component_type: componentMap[type] }));
    handleNext();
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    
    const body = {
      name: formData.name,
      app_id: formData.app_id,
      component_type: formData.component_type,
      success_url_a: formData.success_url_a,
      jwt_secret: ssoEnabled ? formData.jwt_secret : '',
      role_id: formData.role_id || null,
      mobile_otp_enabled: formData.phoneOtpEnabled,
      credentials_enabled: formData.credentials_enabled,
      google_auth_enabled: formData.google_auth_enabled,
      github_auth_enabled: formData.github_auth_enabled,
      qr_code_enabled: formData.qrCodeEnabled,
      card_title: formData.cardTitle,
      card_price: formData.cardPrice,
      card_features: formData.cardFeatures.split('\n').filter(f => f.trim() !== ''),
      card_button_text: formData.cardButtonText,
      card_button_link: formData.cardButtonLink,
      card_badge: formData.cardBadge,
      card_featured: formData.cardFeatured,
      contact_form_recipient_email: formData.contact_form_recipient_email,
      founder_name: formData.founder_name,
      founder_title: formData.founder_title,
      founder_bio: formData.founder_bio,
      founder_image_url: formData.founder_image_url,
      chatbot_welcome_message: formData.chatbot_welcome_message,
      chatbot_initial_questions: formData.chatbot_initial_questions.split('\n').filter(f => f.trim() !== ''),
    };

    try {
      const res = await fetch('/api/embed/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create embed');
      }
      onComplete();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFlowType(null);
    setFormData(initialFormData);
    setSsoEnabled(false);
    setError(null);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  const wizardSteps = {
    auth: [{ num: 1, title: 'Purpose' }, { num: 2, title: 'App' }, { num: 3, title: 'Method' }, { num: 4, title: 'Name' }, { num: 5, title: 'User Flow' }, { num: 6, title: 'SSO' }],
    payment: [{ num: 1, title: 'Purpose' }, { num: 2, title: 'App' }, { num: 3, title: 'Configure' }, { num: 4, title: 'Name' }],
    contact: [{ num: 1, title: 'Purpose' }, { num: 2, title: 'App' }, { num: 3, title: 'Configure' }, { num: 4, title: 'Name' }],
    profile: [{ num: 1, title: 'Purpose' }, { num: 2, title: 'App' }, { num: 3, title: 'Configure' }, { num: 4, title: 'Name' }],
    chatbot: [{ num: 1, title: 'Purpose' }, { num: 2, title: 'App' }, { num: 3, title: 'Configure' }, { num: 4, title: 'Name' }],
  };
  const currentSteps = wizardSteps[flowType] || [];
  const totalSteps = currentSteps.length;

  const isCreateDisabled = isSaving || !formData.name.trim() || (flowType === 'auth' && ssoEnabled && !formData.jwt_secret.trim());

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create New Embed</h2>
          {flowType && (
            <div className="flex justify-between mt-4">
              {currentSteps.map((s, index) => (
                <div key={s.num} className="flex-1">
                  <WizardStep currentStep={step} stepNumber={s.num} title={s.title} />
                  {index < totalSteps - 1 && <div className="h-px bg-gray-200 mt-4 -ml-4 mr-4"></div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="p-6">
              {error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-4 text-sm">{error}</p>}

              {step > 1 && (
                <div className="bg-gray-50 p-3 rounded-md mb-6 border border-gray-200 space-y-2">
                  <SummaryItem label="Purpose" value={formatComponentType(formData.component_type)} />
                  {step > 2 && formData.app_id && <SummaryItem label="App" value={allApps.find(a => a.id === formData.app_id)?.name || 'Unknown'} />}
                  {step > 3 && flowType === 'auth' && <SummaryItem label="Method" value={formatComponentType(formData.component_type)} />}
                  {step > 4 && formData.name && <SummaryItem label="Embed Name" value={formData.name} />}
                </div>
              )}

              {step === 1 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">What is the purpose of this embed?</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => handleSelectFlow('auth')} className="text-left p-4 border rounded-lg hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all"><h4 className="font-semibold text-gray-800">Authentication</h4><p className="text-sm text-gray-500 mt-1">Log users into your app with QR codes, magic links, etc.</p></button>
                    <button onClick={() => handleSelectFlow('payment')} className="text-left p-4 border rounded-lg hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all"><h4 className="font-semibold text-gray-800">Payment</h4><p className="text-sm text-gray-500 mt-1">Display pricing cards and connect with Stripe.</p></button>
                    <button onClick={() => handleSelectFlow('contact')} className="text-left p-4 border rounded-lg hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all"><h4 className="font-semibold text-gray-800">Contact Form</h4><p className="text-sm text-gray-500 mt-1">Collect messages and inquiries from your users.</p></button>
                    <button onClick={() => handleSelectFlow('profile')} className="text-left p-4 border rounded-lg hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all"><h4 className="font-semibold text-gray-800">Founder Profile</h4><p className="text-sm text-gray-500 mt-1">Showcase a profile card for a team member or founder.</p></button>
                    <button onClick={() => handleSelectFlow('chatbot')} className="text-left p-4 border rounded-lg hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all"><h4 className="font-semibold text-gray-800">AI Chatbot</h4><p className="text-sm text-gray-500 mt-1">Add a helpful AI assistant to your site.</p></button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Which app does this embed belong to?</h3>
                  <label htmlFor="app_id" className="block text-sm font-medium text-gray-900">Application</label>
                  <select id="app_id" name="app_id" value={formData.app_id} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                    <option value="">Unassigned</option>
                    {allApps.map(app => (<option key={app.id} value={app.id}>{app.name}</option>))}
                  </select>
                  <p className="mt-2 text-sm text-gray-500">You can create new apps in the 'My Apps' tab on the dashboard.</p>
                </div>
              )}

              {flowType === 'auth' && step === 3 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">How do you want users to sign in?</h3>
                  <p className="text-sm text-gray-500 mb-4">Select one or more methods. A live preview on the right will show you the result.</p>
                  <div className="space-y-3">
                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="qrCodeEnabled" name="qrCodeEnabled" type="checkbox" checked={formData.qrCodeEnabled} onChange={handleAuthMethodChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor="qrCodeEnabled" className="font-medium text-gray-900">QR Code</label></div></div>
                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="phoneOtpEnabled" name="phoneOtpEnabled" type="checkbox" checked={formData.phoneOtpEnabled} onChange={handleAuthMethodChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor="phoneOtpEnabled" className="font-medium text-gray-900">Phone OTP</label></div></div>
                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="credentials_enabled" name="credentials_enabled" type="checkbox" checked={formData.credentials_enabled} onChange={handleAuthMethodChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor="credentials_enabled" className="font-medium text-gray-900">Email & Password</label></div></div>
                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="magicLinkEnabled" name="magicLinkEnabled" type="checkbox" checked={formData.magicLinkEnabled} onChange={handleAuthMethodChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor="magicLinkEnabled" className="font-medium text-gray-900">Magic Link</label></div></div>
                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="google_auth_enabled" name="google_auth_enabled" type="checkbox" checked={formData.google_auth_enabled} onChange={handleAuthMethodChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor="google_auth_enabled" className="font-medium text-gray-900">Google</label></div></div>
                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="github_auth_enabled" name="github_auth_enabled" type="checkbox" checked={formData.github_auth_enabled} onChange={handleAuthMethodChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /></div><div className="ml-3 text-sm leading-6"><label htmlFor="github_auth_enabled" className="font-medium text-gray-900">GitHub</label></div></div>
                  </div>
                </div>
              )}
              
              {flowType === 'auth' && step === 4 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Name Your Embed</h3><label htmlFor="name" className="block text-sm font-medium text-gray-900">Embed Name</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Admin Dashboard Login" /></div>)}
              
              {flowType === 'auth' && step === 5 && (<div><h3 className="text-lg font-medium text-gray-900">Configure User Flow</h3><div className="mt-4"><label htmlFor="success_url_a" className="block text-sm font-medium text-gray-900">Success URL</label><input type="text" id="success_url_a" name="success_url_a" value={formData.success_url_a} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="/dashboard" list="known-routes-list" /><datalist id="known-routes-list">{knownRoutes.map(route => <option key={route} value={route} />)}</datalist></div><div className="mt-4"><label htmlFor="role_id" className="block text-sm font-medium text-gray-900">Assigned Role (Optional)</label><select id="role_id" name="role_id" value={formData.role_id} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"><option value="">Default User</option>{allRoles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></div></div>)}
              
              {flowType === 'auth' && step === 6 && (<div><h3 className="text-lg font-medium text-gray-900 mb-2">Configure Single Sign-On (SSO)</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div onClick={() => { setSsoEnabled(false); setFormData(prev => ({ ...prev, jwt_secret: '' })); }} className={`relative rounded-lg border p-4 cursor-pointer ${!ssoEnabled ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-gray-300'}`}><h4 className="font-semibold text-gray-800">No SSO</h4><p className="text-sm text-gray-500 mt-1">Redirect without a token.</p>{!ssoEnabled && <div className="absolute top-2 right-2 bg-indigo-600 rounded-full p-1"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}</div><div onClick={() => setSsoEnabled(true)} className={`relative rounded-lg border p-4 cursor-pointer ${ssoEnabled ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-gray-300'}`}><h4 className="font-semibold text-gray-800">Enable JWT SSO</h4><p className="text-sm text-gray-500 mt-1">Log users in with a secure token.</p>{ssoEnabled && <div className="absolute top-2 right-2 bg-indigo-600 rounded-full p-1"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}</div></div>{ssoEnabled && (<div className="mt-6 pt-6 border-t"><label htmlFor="jwt_secret" className="block text-sm font-medium text-gray-900">Your JWT Secret</label><div className="mt-1 flex rounded-md shadow-sm"><input type={showSecret ? 'text' : 'password'} id="jwt_secret" name="jwt_secret" value={formData.jwt_secret} onChange={handleChange} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-l-md font-mono" placeholder="Generate or paste a secret" /><button type="button" onClick={() => setShowSecret(!showSecret)} className="relative -ml-px inline-flex items-center px-3 py-2 border border-gray-300 text-sm bg-gray-50">{showSecret ? 'Hide' : 'Show'}</button><button type="button" onClick={generateSecret} className="relative -ml-px inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-r-md bg-gray-50">Generate</button></div><EnvVarBlock lines={[`JWT_VERIFICATION_KEY=${formData.jwt_secret || '<your-secret-here>'}`]} /></div>)}</div>)}

              {flowType === 'payment' && step === 3 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Configure Pricing Card</h3>{loadingConnections ? <p>Checking Stripe...</p> : (<>{configMode === 'choice' && (<div><Link href="/api/stripe/connect" className="w-full inline-flex items-center justify-center px-6 py-3 border text-base font-medium rounded-md text-white bg-indigo-600">Connect with Stripe</Link><p className="mt-4 text-center"><button onClick={() => setConfigMode('manual')} className="text-sm text-indigo-600 hover:underline">Or enter details manually</button></p></div>)}{configMode === 'stripe' && (<div><p>Stripe Connected!</p><button onClick={() => setConfigMode('manual')} className="mt-4 text-sm text-indigo-600 hover:underline">Enter Details Manually →</button></div>)}{configMode === 'manual' && (<div className="space-y-4"><div><label htmlFor="cardTitle" className="block text-sm font-medium text-gray-900">Card Title</label><input type="text" id="cardTitle" name="cardTitle" value={formData.cardTitle} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div><div><label htmlFor="cardPrice" className="block text-sm font-medium text-gray-900">Price</label><input type="text" id="cardPrice" name="cardPrice" value={formData.cardPrice} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div><div><label htmlFor="cardFeatures" className="block text-sm font-medium text-gray-900">Features</label><textarea id="cardFeatures" name="cardFeatures" value={formData.cardFeatures} onChange={handleChange} rows="3" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea></div></div>)}</>)}</div>)}
              {flowType === 'payment' && step === 4 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Name Your Embed</h3><label htmlFor="name" className="block text-sm font-medium text-gray-900">Embed Name</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>)}

              {flowType === 'contact' && step === 3 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Configure Contact Form</h3><div><label htmlFor="contact_form_recipient_email" className="block text-sm font-medium text-gray-900">Recipient Email</label><input type="email" id="contact_form_recipient_email" name="contact_form_recipient_email" value={formData.contact_form_recipient_email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="you@example.com" /></div></div>)}
              {flowType === 'contact' && step === 4 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Name Your Embed</h3><label htmlFor="name" className="block text-sm font-medium text-gray-900">Embed Name</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>)}

              {flowType === 'profile' && step === 3 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Configure Founder Profile</h3><div className="space-y-4"><div><label htmlFor="founder_name" className="block text-sm font-medium text-gray-900">Name</label><input type="text" id="founder_name" name="founder_name" value={formData.founder_name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div><div><label htmlFor="founder_title" className="block text-sm font-medium text-gray-900">Title</label><input type="text" id="founder_title" name="founder_title" value={formData.founder_title} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div><div><label htmlFor="founder_image_url" className="block text-sm font-medium text-gray-900">Image URL</label><input type="url" id="founder_image_url" name="founder_image_url" value={formData.founder_image_url} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /><p className="mt-2 text-xs text-gray-500">Need to upload an image? Use a free service like <a href="https://imgur.com/upload" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Imgur</a> and paste the direct image link here.</p></div><div><label htmlFor="founder_bio" className="block text-sm font-medium text-gray-900">Bio</label><textarea id="founder_bio" name="founder_bio" value={formData.founder_bio} onChange={handleChange} rows="3" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea></div></div></div>)}
              {flowType === 'profile' && step === 4 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Name Your Embed</h3><label htmlFor="name" className="block text-sm font-medium text-gray-900">Embed Name</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>)}

              {flowType === 'chatbot' && step === 3 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Configure Chatbot</h3><div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800"><p><strong>Note:</strong> The chatbot requires an `OPENAI_API_KEY` to be set in your server's environment variables. This key is kept secure on the server and is never exposed to the public.</p></div><div className="space-y-4 mt-4"><div><label htmlFor="chatbot_welcome_message" className="block text-sm font-medium text-gray-900">Welcome Message</label><input type="text" id="chatbot_welcome_message" name="chatbot_welcome_message" value={formData.chatbot_welcome_message} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div><div><label htmlFor="chatbot_initial_questions" className="block text-sm font-medium text-gray-900">Initial Questions (one per line)</label><textarea id="chatbot_initial_questions" name="chatbot_initial_questions" value={formData.chatbot_initial_questions} onChange={handleChange} rows="3" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea></div></div></div>)}
              {flowType === 'chatbot' && step === 4 && (<div><h3 className="text-lg font-medium text-gray-900 mb-4">Name Your Embed</h3><label htmlFor="name" className="block text-sm font-medium text-gray-900">Embed Name</label><input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" /></div>)}

            </div>
            <div className="hidden md:block p-6">
              {step > 2 && (
                <div className="sticky top-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Live Preview</h4>
                  <div className="bg-gray-100 p-8 rounded-lg flex items-center justify-center">
                    <EmbedPreview formData={formData} flowType={flowType} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between p-6 bg-gray-50 rounded-b-lg">
          <div>
            {step > 1 && <button onClick={handleBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Back</button>}
          </div>
          <div className="space-x-3">
            <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            {step < totalSteps && <button onClick={handleNext} disabled={(flowType === 'auth' && step === 3 && !atLeastOneAuthMethodSelected) || (flowType === 'auth' && step === 4 && !formData.name.trim())} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">Next</button>}
            {step === totalSteps && <button onClick={handleSubmit} disabled={isCreateDisabled} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:bg-gray-400">{isSaving ? 'Creating...' : 'Create Embed'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}