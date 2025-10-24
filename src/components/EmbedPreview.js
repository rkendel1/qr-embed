import React from 'react';

const QrCodePlaceholder = () => (
  <svg width="160" height="160" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M0 0H40V10H10V40H0V0ZM10 10H30V30H10V10Z" fill="#4A5568"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M60 0H100V40H90V10H60V0ZM70 10H90V30H70V10Z" fill="#4A5568"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M0 60H40V90H10V60H0ZM10 70H30V90H10V70Z" fill="#4A5568"/>
    <path d="M90 60H100V70H90V60Z" fill="#4A5568"/><path d="M60 90H70V100H60V90Z" fill="#4A5568"/><path d="M40 40H50V50H40V40Z" fill="#4A5568"/><path d="M50 50H60V60H50V50Z" fill="#4A5568"/><path d="M60 60H70V70H60V60Z" fill="#4A5568"/><path d="M70 70H80V80H70V70Z" fill="#4A5568"/><path d="M80 80H90V90H80V80Z" fill="#4A5568"/><path d="M90 90H100V100H90V90Z" fill="#4A5568"/><path d="M40 60H50V70H40V60Z" fill="#4A5568"/><path d="M50 70H60V80H50V70Z" fill="#4A5568"/><path d="M60 40H70V50H60V40Z" fill="#4A5568"/><path d="M70 50H80V60H70V50Z" fill="#4A5568"/><path d="M80 40H90V50H80V40Z" fill="#4A5568"/><path d="M90 50H100V60H90V50Z" fill="#4A5568"/>
  </svg>
);

const SocialButtonsPreview = ({ google, github }) => {
  const baseButtonStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontWeight: 500, padding: '10px', borderRadius: '8px', fontSize: '16px', transition: 'all 0.2s ease-in-out', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', boxSizing: 'border-box', cursor: 'not-allowed' };
  const providerDetails = {
    google: { name: 'Google', style: { ...baseButtonStyle, backgroundColor: '#fff', color: '#374151', border: '1px solid #e5e7eb' }, icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" style={{ marginRight: '10px' }}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.494,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg> },
    github: { name: 'GitHub', style: { ...baseButtonStyle, backgroundColor: '#24292e', color: '#fff', border: '1px solid #24292e' }, icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '10px' }} fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
  };
  const enabledProviders = [];
  if (google) enabledProviders.push('google');
  if (github) enabledProviders.push('github');
  if (enabledProviders.length === 0) return null;
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>{enabledProviders.map(p => { const d = providerDetails[p]; return <button key={p} style={d.style}>{d.icon} Continue with {d.name}</button> })}</div>);
};

const AuthPreview = ({ formData }) => {
  const showSocial = formData.google_auth_enabled || formData.github_auth_enabled;
  const showQr = formData.qrCodeEnabled;
  const showCredentials = formData.credentials_enabled;
  const showOtp = formData.phoneOtpEnabled;
  const showMagicLink = formData.magicLinkEnabled;
  const isSocialOnly = showSocial && !showQr && !showCredentials && !showOtp && !showMagicLink;
  const isOtpOnly = showOtp && !showSocial && !showQr && !showCredentials && !showMagicLink;
  const isMagicLinkOnly = showMagicLink && !showSocial && !showQr && !showCredentials && !showOtp;
  if (isSocialOnly) return (<div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', textAlign: 'center', background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '360px', margin: 'auto' }}><h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 24px', color: '#111827' }}>Sign in to your account</h2><SocialButtonsPreview google={formData.google_auth_enabled} github={formData.github_auth_enabled} /></div>);
  if (isOtpOnly) return <MobileOtpPreview />;
  if (isMagicLinkOnly) return <MagicLinkPreview />;
  return (<div style={{ fontFamily: 'sans-serif', color: '#374151', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '320px', margin: 'auto' }}>{showSocial && (<><SocialButtonsPreview google={formData.google_auth_enabled} github={formData.github_auth_enabled} /><div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', color: '#9ca3af', fontSize: '12px', margin: '0' }}><hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} /><span>OR</span><hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} /></div></>)}{showQr && (<><div style={{ width: '160px', height: '160px', borderRadius: '8px', overflow: 'hidden' }}><QrCodePlaceholder /></div><p style={{ margin: '8px 0 0', fontSize: '14px', minHeight: '20px', textAlign: 'center' }}>Scan the QR code to connect.</p></>)}{showCredentials && <button style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '14px', padding: '4px' }}>Sign in with Email</button>}</div>);
};

const MobileOtpPreview = () => (<div style={{ fontFamily: 'sans-serif', textAlign: 'center', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '320px', margin: 'auto' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>Enter your email address to continue.</p><input type="email" placeholder="you@example.com" style={{ width: '100%', padding: '10px', border: '2px solid #9ca3af', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }} readOnly /><button style={{ width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 600, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontSize: '16px' }}>Send Code</button></div></div>);
const MagicLinkPreview = () => (<div style={{ fontFamily: 'sans-serif', textAlign: 'center', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '320px', margin: 'auto' }}><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>Magic Link Login</h3><p style={{ margin: 0, fontSize: '14px', color: '#374151' }}>Enter your email to receive a login link.</p><input type="email" placeholder="you@example.com" style={{ width: '100%', padding: '10px', border: '2px solid #9ca3af', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }} readOnly /><button style={{ width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 600, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'not-allowed', fontSize: '16px' }}>Send Magic Link</button></div></div>);

const PricingCardPreview = ({ formData }) => {
  const featuresHtml = (formData.cardFeatures || '').split('\n').filter(f => f.trim()).map((feature, i) => (<li key={i} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', color: '#4b5569' }}><svg style={{ width: '16px', height: '16px', color: '#22c55e', marginRight: '8px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>{feature}</li>));
  const isFeatured = formData.cardFeatured;
  const cardStyles = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', border: isFeatured ? '2px solid #4f46e5' : '1px solid #e2e8f0', borderRadius: '12px', width: '320px', textAlign: 'center', padding: '24px', boxShadow: isFeatured ? '0 10px 25px -5px rgba(79, 70, 229, 0.2), 0 8px 10px -6px rgba(79, 70, 229, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)', background: 'white', position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' };
  const badgeStyles = { display: 'inline-block', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '9999px', marginBottom: '16px' };
  return (<div style={cardStyles}><div style={{ minHeight: '40px' }}>{formData.cardBadge && <div style={badgeStyles}>{formData.cardBadge}</div>}</div><h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', color: '#1f2937' }}>{formData.cardTitle || 'Pro Plan'}</h3><p style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 16px', color: '#111827', display: 'flex', justifyContent: 'center', alignItems: 'baseline' }}>{formData.cardPrice || '$25'}<span style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280', marginLeft: '4px' }}>/mo</span></p><div style={{ flexGrow: 1 }}><ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', minHeight: '96px', textAlign: 'left' }}>{featuresHtml.length > 0 ? featuresHtml : (<li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', color: '#4b5569' }}><svg style={{ width: '16px', height: '16px', color: '#22c55e', marginRight: '8px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>Feature One</li>)}</ul></div><button style={{ width: '100%', backgroundColor: isFeatured ? '#4f46e5' : '#f3f4f6', color: isFeatured ? 'white' : '#1f2937', fontWeight: 600, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'not-allowed', marginTop: 'auto' }}>{formData.cardButtonText || 'Choose Plan'}</button></div>);
};

const ContactFormPreview = () => {
  const baseInputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '360px', boxSizing: 'border-box', margin: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 600, margin: 0, textAlign: 'center', color: '#111827' }}>Contact Us</h3>
        <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: '-8px 0 8px' }}>We'd love to hear from you!</p>
        
        <div style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Your Name</label>
          <input type="text" placeholder="Jane Doe" style={baseInputStyle} readOnly />
        </div>
        
        <div style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Your Email</label>
          <input type="email" placeholder="jane.doe@example.com" style={baseInputStyle} readOnly />
        </div>

        <div style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Message</label>
          <textarea placeholder="Your message..." rows="4" style={{ ...baseInputStyle, resize: 'vertical' }} readOnly></textarea>
        </div>
        
        <button style={{ width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 600, padding: '12px', border: 'none', borderRadius: '8px', cursor: 'not-allowed', fontSize: '16px' }}>
          Send Message
        </button>
      </div>
    </div>
  );
};
const FounderProfilePreview = ({ formData }) => (<div style={{ fontFamily: 'sans-serif', background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '320px', boxSizing: 'border-box', margin: 'auto', textAlign: 'center' }}><div style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#e5e7eb', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{formData.founder_image_url ? <img src={formData.founder_image_url} alt="Founder" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}</div><h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px' }}>{formData.founder_name || 'Founder Name'}</h3><p style={{ margin: '0 0 12px', fontSize: '14px', color: '#6b7280' }}>{formData.founder_title || 'Founder & CEO'}</p><p style={{ margin: 0, fontSize: '14px', color: '#4b5563', fontStyle: 'italic' }}>{formData.founder_bio || '"A short, impactful quote or bio goes here."'}</p></div>);
const ChatbotPreview = () => (<div style={{ position: 'relative', width: '64px', height: '64px', background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><svg xmlns="http://www.w3.org/2000/svg" style={{ width: '32px', height: '32px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></div>);

export default function EmbedPreview({ formData, flowType }) {
  if (flowType === 'payment') return <PricingCardPreview formData={formData} />;
  if (flowType === 'auth') return <AuthPreview formData={formData} />;
  if (flowType === 'contact') return <ContactFormPreview />;
  if (flowType === 'profile') return <FounderProfilePreview formData={formData} />;
  if (flowType === 'chatbot') return <ChatbotPreview />;
  return null;
}