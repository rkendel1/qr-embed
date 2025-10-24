(async () => {
  // This function helps find the script tag that is currently executing.
  // It's necessary because `document.currentScript` is not reliable for scripts
  // that are loaded dynamically or asynchronously in some browsers.
  function findMyScript() {
    // The most reliable method.
    if (document.currentScript) {
      return document.currentScript;
    }
    // A fallback for older browsers or specific loading scenarios.
    // We look for a script tag pointing to "embed.js" that has a "data-token"
    // and hasn't been marked as processed by our script yet.
    const scripts = document.querySelectorAll('script[src*="embed.js"][data-token]:not([data-processed="true"])');
    // Return the last one found, as it's the most likely to be the one running.
    return scripts[scripts.length - 1];
  }

  const script = findMyScript();
  if (!script) {
    console.error("Embed Script: Could not find the executing script tag.");
    return;
  }

  // Mark this script tag as processed so we don't try to run it again.
  script.dataset.processed = "true";

  const templateToken = script.dataset.token;
  const apiHost = script.dataset.host;
  const targetId = script.dataset.targetId;

  if (!apiHost || !templateToken) {
    console.error("Embed Script: 'data-host' and 'data-token' attributes are required.");
    return;
  }

  const targetElement = targetId ? document.getElementById(targetId) : null;
  const container = document.createElement('div');

  if (targetElement) {
    targetElement.innerHTML = '';
    targetElement.appendChild(container);
  } else {
    script.parentNode.insertBefore(container, script);
  }

  // --- Utility Functions ---
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // --- Success Handler with In-App Messaging Bridge ---
  function handleSuccess(payload) {
    const successUrl = payload.successUrl;
    const message = { type: 'VERIFICATION_SUCCESS', ...payload };

    // Check for React Native WebView
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      console.log("Embed Script: Detected React Native WebView. Posting message.");
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
      return;
    }

    // Check for native iOS WebView (WKWebView)
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.jsMessageHandler) {
      console.log("Embed Script: Detected iOS WKWebView. Posting message.");
      window.webkit.messageHandlers.jsMessageHandler.postMessage(message);
      return;
    }
    
    // Check for native Android WebView
    if (window.Android && window.Android.postMessage) {
        console.log("Embed Script: Detected Android WebView. Posting message.");
        window.Android.postMessage(JSON.stringify(message));
        return;
    }

    // Fallback to redirect for standard web browsers
    if (successUrl) {
      console.log("Embed Script: No WebView bridge detected. Redirecting.");
      const target = window.top || window;
      try {
        target.location.replace(successUrl);
      } catch (e) {
        console.error("Embed Script: Could not redirect top window, redirecting self.", e);
        window.location.replace(successUrl);
      }
    } else {
      container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 170px;"><p style="font-family: sans-serif; color: #16a34a; font-size: 16px; font-weight: bold;">Connected!</p></div>';
    }
  }

  // --- Component Rendering Functions ---

  function renderSocialLogin(data) {
    const { componentProps, templateToken } = data;
    const providers = componentProps?.providers || [];
    const socialButtonsHtml = renderSocialButtons(providers, templateToken, true);

    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; box-sizing: border-box; margin: auto;">
        <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px; color: #111827;">Sign in to your account</h2>
        ${socialButtonsHtml}
      </div>
    `;
  }

  function renderSocialButtons(providers, templateToken, isStandalone) {
    if (!providers || providers.length === 0) {
      return isStandalone ? '<p style="font-size: 12px; color: #9ca3af;">No social providers have been configured for this embed.</p>' : '';
    }

    const baseButtonStyle = `display: flex; align-items: center; justify-content: center; width: 100%; font-weight: 500; padding: 10px; border-radius: 8px; font-size: 16px; transition: all 0.2s ease-in-out; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); text-decoration: none; box-sizing: border-box;`;

    const providerDetails = {
      google: { 
        name: 'Google', 
        style: `${baseButtonStyle} background-color: #fff; color: #374151; border: 1px solid #e5e7eb;`,
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px" style="margin-right: 10px;"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.494,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>`
      },
      github: { 
        name: 'GitHub', 
        style: `${baseButtonStyle} background-color: #24292e; color: #fff; border: 1px solid #24292e;`,
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20px" height="20px" style="margin-right: 10px;" fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`
      },
    };

    const buttonsHtml = providers.map(provider => {
      const details = providerDetails[provider];
      if (!details) return '';
      const url = `${apiHost}/api/auth/social/connect?provider=${provider}&token=${templateToken}&origin=${encodeURIComponent(window.location.origin)}`;
      return `
        <a href="${url}" style="${details.style} cursor: pointer;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
          ${details.icon}
          Continue with ${details.name}
        </a>
      `;
    }).join('');

    const divider = isStandalone ? '' : `
      <div style="display: flex; align-items: center; gap: 8px; width: 100%; color: #9ca3af; font-size: 12px; margin: 12px 0;">
        <hr style="flex-grow: 1; border: none; border-top: 1px solid #e5e7eb;" />
        <span>OR</span>
        <hr style="flex-grow: 1; border: none; border-top: 1px solid #e5e7eb;" />
      </div>
    `;

    return `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            ${buttonsHtml}
        </div>
        ${divider}
    `;
  }

  function renderPricingCard(props) {
    const { title, price, features, buttonText, buttonLink, badge, featured } = props || {};
    const featuresHtml = (features || []).map(feature => `
      <li style="margin-bottom: 8px; display: flex; align-items: center; color: #4b5569;">
        <svg style="width: 16px; height: 16px; color: #22c55e; margin-right: 8px; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
        ${feature}
      </li>
    `).join('');
    
    const isFeatured = featured;
    const cardStyles = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border: ${isFeatured ? '2px solid #4f46e5' : '1px solid #e2e8f0'}; border-radius: 12px; width: 320px; text-align: center; padding: 24px; box-shadow: ${isFeatured ? '0 10px 25px -5px rgba(79, 70, 229, 0.2), 0 8px 10px -6px rgba(79, 70, 229, 0.2)' : '0 4px 12px rgba(0,0,0,0.05)'}; background: white; position: relative; display: flex; flex-direction: column; height: 100%;`;
    const badgeHtml = badge ? `<div style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 9999px; margin-bottom: 16px;">${badge}</div>` : '';

    container.innerHTML = `
      <div style="${cardStyles}">
        <div style="min-height: 40px;">${badgeHtml}</div>
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #1f2937;">${title || 'Pro Plan'}</h3>
        <p style="font-size: 48px; font-weight: bold; margin: 0 0 16px; color: #111827; display: flex; justify-content: center; align-items: baseline;">
          ${price || '$25'}
          <span style="font-size: 16px; font-weight: 500; color: #6b7280; margin-left: 4px;">/mo</span>
        </p>
        <div style="flex-grow: 1;">
          <ul style="list-style: none; padding: 0; margin: 0 0 24px; min-height: 96px; text-align: left;">
            ${featuresHtml || `<li style="margin-bottom: 8px; display: flex; align-items: center; color: #4b5569;"><svg style="width: 16px; height: 16px; color: #22c55e; margin-right: 8px; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>Feature One</li>`}
          </ul>
        </div>
        <button 
          onclick="window.open('${buttonLink || '#'}', '_blank')"
          style="width: 100%; background-color: ${isFeatured ? '#4f46e5' : '#f3f4f6'}; color: ${isFeatured ? 'white' : '#1f2937'}; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer; margin-top: auto;"
        >
          ${buttonText || 'Choose Plan'}
        </button>
      </div>
    `;
  }

  function renderQrAuth(data) {
    const { qrDataUrl, sessionToken, socialProviders, credentialsEnabled, templateToken } = data;
    const socialButtonsHtml = renderSocialButtons(socialProviders, templateToken, false);
    
    container.innerHTML = `
      <div style="font-family: sans-serif; color: #374151; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; align-items: center; gap: 16px; width: 320px; box-sizing: border-box; margin: auto;">
        ${socialButtonsHtml}
        <div id="auth-method-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 280px; transition: all 0.2s ease-in-out;">
          <!-- content will be rendered here -->
        </div>
        ${credentialsEnabled ? '<button id="toggle-auth-method" style="background: none; border: none; color: #4f46e5; cursor: pointer; font-size: 14px; padding: 4px;"></button>' : ''}
      </div>
    `;

    const authMethodContainer = container.querySelector('#auth-method-container');
    const toggleBtn = container.querySelector('#toggle-auth-method');

    let img = null;
    if (qrDataUrl) {
      img = document.createElement("img");
      img.src = qrDataUrl;
      img.style.width = "160px";
      img.style.height = "160px";
    }

    const evtSource = new EventSource(`${apiHost}/api/events?token=${sessionToken}`);
    
    evtSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      const statusContainer = authMethodContainer.querySelector('#status-container');
      if (!statusContainer) return;

      switch (event.state) {
        case 'scanned':
          statusContainer.innerText = 'Scanned! Please approve on your device.';
          statusContainer.style.color = '#d97706';
          break;
        case 'verified':
          handleSuccess(event);
          evtSource.close();
          break;
        default:
          statusContainer.innerText = 'Scan the QR code to connect.';
      }
    };

    evtSource.onerror = () => {
      const statusContainer = authMethodContainer.querySelector('#status-container');
      if (statusContainer) {
        statusContainer.innerText = "Connection lost. Please refresh.";
        statusContainer.style.color = '#dc2626';
      }
      evtSource.close();
    };

    const showQr = () => {
      authMethodContainer.innerHTML = `
        <div id="qr-container" style="width: 160px; height: 160px; border-radius: 8px; overflow: hidden;"></div>
        <p id="status-container" style="margin: 8px 0 0; font-size: 14px; min-height: 20px; text-align: center;">Scan the QR code to connect.</p>
      `;
      authMethodContainer.querySelector('#qr-container').appendChild(img);
      if (toggleBtn) {
        toggleBtn.innerHTML = 'Sign in with Email';
        toggleBtn.style.display = '';
      }
    };

    const showCredentials = () => {
      renderCredentialsAuth(authMethodContainer, sessionToken);
      if (toggleBtn) {
        toggleBtn.innerHTML = '‹ Sign in with QR Code';
        if (!qrDataUrl) {
          toggleBtn.style.display = 'none'; // Hide toggle if there's no QR to go back to
        }
      }
    };

    if (toggleBtn) {
      let isShowingQr = !!qrDataUrl;
      toggleBtn.addEventListener('click', () => {
        if (isShowingQr) {
          showCredentials();
        } else {
          showQr();
        }
        isShowingQr = !isShowingQr;
      });
    }
    
    // Initial render logic
    if (qrDataUrl) {
      showQr();
    } else if (credentialsEnabled) {
      showCredentials();
    } else {
      // Fallback if somehow nothing is enabled for this component
      authMethodContainer.innerHTML = '<p style="font-size: 14px; color: #9ca3af;">No sign-in methods are enabled.</p>';
      if (toggleBtn) toggleBtn.style.display = 'none';
    }
  }

  function renderCredentialsAuth(authContainer, sessionToken) {
    let state = { view: 'login' }; // 'login', 'signup', 'forgot', 'forgot_sent'

    const render = () => {
      let content = '';
      switch (state.view) {
        case 'signup':
          content = `
            <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">Create Account</h3>
            <input id="email" type="email" placeholder="Email" style="margin-bottom: 8px; width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
            <input id="password" type="password" placeholder="Password" style="margin-bottom: 8px; width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
            <input id="confirm_password" type="password" placeholder="Confirm Password" style="margin-bottom: 12px; width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
            <button id="submit-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">Sign Up</button>
            <p style="margin: 12px 0 0; font-size: 14px;">Already have an account? <button id="switch-view" data-view="login" style="background:none; border:none; color:#4f46e5; cursor:pointer; padding:0;">Log In</button></p>
          `;
          break;
        case 'forgot':
          content = `
            <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">Reset Password</h3>
            <p style="font-size: 14px; color: #4b5563; margin: 0 0 12px;">Enter your email to receive a password reset link.</p>
            <input id="email" type="email" placeholder="Email" style="margin-bottom: 12px; width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
            <button id="submit-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">Send Reset Link</button>
            <p style="margin: 12px 0 0; font-size: 14px;"><button id="switch-view" data-view="login" style="background:none; border:none; color:#4f46e5; cursor:pointer; padding:0;">Back to Log In</button></p>
          `;
          break;
        case 'forgot_sent':
          content = `
            <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">Check Your Email</h3>
            <p style="font-size: 14px; color: #4b5563; margin: 0 0 12px;">If an account with that email exists, we've sent a password reset link to it.</p>
            <p style="margin: 12px 0 0; font-size: 14px;"><button id="switch-view" data-view="login" style="background:none; border:none; color:#4f46e5; cursor:pointer; padding:0;">Back to Log In</button></p>
          `;
          break;
        case 'login':
        default:
          content = `
            <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px;">Log In</h3>
            <input id="email" type="email" placeholder="Email" style="margin-bottom: 8px; width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
            <input id="password" type="password" placeholder="Password" style="margin-bottom: 12px; width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box;">
            <button id="submit-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">Log In</button>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 12px;">
              <button id="switch-view" data-view="forgot" style="background:none; border:none; color:#4f46e5; cursor:pointer; padding:0;">Forgot Password?</button>
              <button id="switch-view-signup" data-view="signup" style="background:none; border:none; color:#4f46e5; cursor:pointer; padding:0;">Sign Up</button>
            </div>
          `;
          break;
      }

      authContainer.innerHTML = `
        <div style="width: 100%; text-align: center;">
          ${content}
          <p id="credentials-status" style="font-size: 12px; color: #dc2626; min-height: 16px; margin-top: 8px;"></p>
        </div>
      `;
      addEventListeners();
    };

    const addEventListeners = () => {
      authContainer.querySelectorAll('#switch-view, #switch-view-signup').forEach(btn => {
        btn.addEventListener('click', (e) => {
          state.view = e.target.dataset.view;
          render();
        });
      });
      const submitBtn = authContainer.querySelector('#submit-btn');
      if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
      }
    };

    const handleSubmit = async () => {
      const statusEl = authContainer.querySelector('#credentials-status');
      const submitBtn = authContainer.querySelector('#submit-btn');
      statusEl.innerText = '';
      submitBtn.disabled = true;
      submitBtn.innerText = '...';

      const email = authContainer.querySelector('#email')?.value;
      const password = authContainer.querySelector('#password')?.value;
      
      try {
        let res, body, successMessage;
        switch (state.view) {
          case 'signup':
            const confirmPassword = authContainer.querySelector('#confirm_password').value;
            if (password.length < 6) throw new Error("Password must be at least 6 characters.");
            if (password !== confirmPassword) throw new Error("Passwords do not match.");
            body = { email, password, sessionToken };
            res = await fetch(`${apiHost}/api/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            successMessage = "Account created! Logging you in...";
            break;
          case 'forgot':
            body = { email };
            res = await fetch(`${apiHost}/api/auth/password/request-reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            break;
          case 'login':
          default:
            body = { email, password, sessionToken };
            res = await fetch(`${apiHost}/api/auth/credentials-login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            successMessage = "Login successful! Redirecting...";
            break;
        }
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'An unknown error occurred.');

        if (state.view === 'forgot') {
          state.view = 'forgot_sent';
          render();
        } else if (data.successUrl) {
          statusEl.innerText = successMessage;
          statusEl.style.color = '#16a34a'; // green
          setTimeout(() => handleSuccess(data), 1500);
        }

      } catch (error) {
        statusEl.innerText = error.message;
        submitBtn.disabled = false;
        
        let buttonText = 'Submit';
        switch (state.view) {
          case 'signup': buttonText = 'Sign Up'; break;
          case 'login': buttonText = 'Log In'; break;
          case 'forgot': buttonText = 'Send Reset Link'; break;
        }
        submitBtn.innerText = buttonText;
      }
    };

    render();
  }

  function renderMobileAuth(data) {
    const { sessionToken, socialProviders, templateToken } = data;
    const socialButtonsHtml = renderSocialButtons(socialProviders, templateToken, false);
    let state = { currentStep: 'email', otpToken: null };

    const renderWrapper = (content) => {
      container.innerHTML = `
        <div style="font-family: sans-serif; text-align: center; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; box-sizing: border-box; margin: auto;">
          ${socialButtonsHtml}
          ${content}
        </div>
      `;
    };

    const renderEmailInputStep = () => {
      const content = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <p style="margin: 0; font-size: 14px; color: #374151;">Enter your email address to continue.</p>
          <input id="email-input" type="email" placeholder="you@example.com" style="width: 100%; padding: 10px; border: 2px solid #9ca3af; border-radius: 6px; font-size: 16px; box-sizing: border-box; transition: border-color 0.2s ease-in-out;">
          <button id="send-otp-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Send Code
          </button>
          <p id="mobile-status" style="font-size: 12px; color: #dc2626; min-height: 16px;"></p>
        </div>
      `;
      renderWrapper(content);
      const emailInput = container.querySelector('#email-input');
      emailInput.addEventListener('focus', () => { emailInput.style.borderColor = '#4f46e5'; });
      emailInput.addEventListener('blur', () => { emailInput.style.borderColor = '#9ca3af'; });
      container.querySelector('#send-otp-btn').addEventListener('click', handleSendOtp);
    };

    const renderOtpInputStep = () => {
      const content = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <p style="margin: 0; font-size: 14px; color: #374151;">We sent a code to your email. Please enter it below.</p>
          <input id="otp-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="123456" style="width: 100%; padding: 10px; border: 2px solid #9ca3af; border-radius: 6px; font-size: 16px; text-align: center; box-sizing: border-box; transition: border-color 0.2s ease-in-out;">
          <button id="verify-otp-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Verify
          </button>
          <p id="mobile-status" style="font-size: 12px; color: #dc2626; min-height: 16px;"></p>
        </div>
      `;
      renderWrapper(content);
      const otpInput = container.querySelector('#otp-input');
      otpInput.addEventListener('focus', () => { otpInput.style.borderColor = '#4f46e5'; });
      otpInput.addEventListener('blur', () => { otpInput.style.borderColor = '#9ca3af'; });
      container.querySelector('#verify-otp-btn').addEventListener('click', handleVerifyOtp);
    };

    const render = () => {
      if (state.currentStep === 'email') renderEmailInputStep();
      else if (state.currentStep === 'otp') renderOtpInputStep();
    };

    async function handleSendOtp() {
      const emailInput = container.querySelector('#email-input');
      const sendBtn = container.querySelector('#send-otp-btn');
      const statusEl = container.querySelector('#mobile-status');
      
      if (!emailInput.value) {
        statusEl.innerText = 'Please enter an email address.';
        return;
      }
      
      sendBtn.disabled = true;
      sendBtn.innerText = 'Sending...';
      statusEl.innerText = '';

      try {
        const res = await fetch(`${apiHost}/api/otp/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessionToken, email: emailInput.value }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to send OTP.');
        }
        const result = await res.json();
        state.otpToken = result.otpToken;
        state.currentStep = 'otp';
        render();
      } catch (error) {
        statusEl.innerText = error.message;
        sendBtn.disabled = false;
        sendBtn.innerText = 'Send Code';
      }
    }

    async function handleVerifyOtp() {
      const otpInput = container.querySelector('#otp-input');
      const verifyBtn = container.querySelector('#verify-otp-btn');
      const statusEl = container.querySelector('#mobile-status');

      if (!otpInput.value) {
        statusEl.innerText = 'Please enter the code.';
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.innerText = 'Verifying...';
      statusEl.innerText = '';

      try {
        const res = await fetch(`${apiHost}/api/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otpToken: state.otpToken, otp: otpInput.value }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Verification failed.');
        }
        
        handleSuccess(result);

      } catch (error) {
        statusEl.innerText = error.message;
        verifyBtn.disabled = false;
        verifyBtn.innerText = 'Verify';
      }
    }

    render();
  }

  function renderMagicLinkAuth(data) {
    const { sessionToken } = data;
    let state = { isSubmitted: false };

    const renderWrapper = (content) => {
      container.innerHTML = `
        <div style="font-family: sans-serif; text-align: center; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; box-sizing: border-box; margin: auto;">
          ${content}
        </div>
      `;
    };

    const renderEmailInputStep = () => {
      const content = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 4px;">Magic Link Login</h3>
          <p style="margin: 0; font-size: 14px; color: #374151;">Enter your email to receive a login link.</p>
          <input id="email-input" type="email" placeholder="you@example.com" style="width: 100%; padding: 10px; border: 2px solid #9ca3af; border-radius: 6px; font-size: 16px; box-sizing: border-box; transition: border-color 0.2s ease-in-out;">
          <button id="send-link-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Send Magic Link
          </button>
          <p id="magic-link-status" style="font-size: 12px; color: #dc2626; min-height: 16px;"></p>
        </div>
      `;
      renderWrapper(content);
      const emailInput = container.querySelector('#email-input');
      emailInput.addEventListener('focus', () => { emailInput.style.borderColor = '#4f46e5'; });
      emailInput.addEventListener('blur', () => { emailInput.style.borderColor = '#9ca3af'; });
      container.querySelector('#send-link-btn').addEventListener('click', handleSendLink);
    };

    const renderSubmittedStep = () => {
      const content = `
        <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
          <svg style="width: 48px; height: 48px; color: #16a34a;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 style="font-size: 18px; font-weight: 600; margin: 0;">Check Your Email</h3>
          <p style="margin: 0; font-size: 14px; color: #374151;">We've sent a magic link to your inbox. Click the link to complete your login.</p>
        </div>
      `;
      renderWrapper(content);
    };

    const render = () => {
      if (state.isSubmitted) {
        renderSubmittedStep();
      } else {
        renderEmailInputStep();
      }
    };

    async function handleSendLink() {
      const emailInput = container.querySelector('#email-input');
      const sendBtn = container.querySelector('#send-link-btn');
      const statusEl = container.querySelector('#magic-link-status');
      
      if (!emailInput.value) {
        statusEl.innerText = 'Please enter an email address.';
        return;
      }
      
      sendBtn.disabled = true;
      sendBtn.innerText = 'Sending...';
      statusEl.innerText = '';

      try {
        const res = await fetch(`${apiHost}/api/magic-link/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessionToken, email: emailInput.value }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to send link.');
        }
        state.isSubmitted = true;
        render();
      } catch (error) {
        statusEl.innerText = error.message;
        sendBtn.disabled = false;
        sendBtn.innerText = 'Send Magic Link';
      }
    }

    const evtSource = new EventSource(`${apiHost}/api/events?token=${sessionToken}`);
    evtSource.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.state === 'verified') {
        handleSuccess(event);
        evtSource.close();
      }
    };
    evtSource.onerror = () => {
      console.error("Magic Link Embed: SSE connection error.");
      evtSource.close();
    };

    render();
  }

  function renderContactForm(data) {
    const { templateToken } = data;
    
    const baseInputStyle = `width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box; transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;`;
    const baseLabelStyle = `display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;`;

    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 360px; box-sizing: border-box; margin: auto;">
        <div id="contact-form-wrapper" style="display: flex; flex-direction: column; gap: 16px;">
          <h3 style="font-size: 22px; font-weight: 600; margin: 0; text-align: center; color: #111827;">Contact Us</h3>
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin: -8px 0 8px;">We'd love to hear from you!</p>
          
          <div style="text-align: left;">
            <label for="contact-name" style="${baseLabelStyle}">Your Name</label>
            <input id="contact-name" type="text" placeholder="Jane Doe" style="${baseInputStyle}" />
          </div>
          
          <div style="text-align: left;">
            <label for="contact-email" style="${baseLabelStyle}">Your Email</label>
            <input id="contact-email" type="email" placeholder="jane.doe@example.com" style="${baseInputStyle}" />
          </div>

          <div style="text-align: left;">
            <label for="contact-message" style="${baseLabelStyle}">Message</label>
            <textarea id="contact-message" placeholder="Your message..." rows="4" style="${baseInputStyle} resize: vertical;"></textarea>
          </div>
          
          <button id="contact-submit-btn" style="width: 100%; background-color: #4f46e5; color: white; font-weight: 600; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
            Send Message
          </button>
          <p id="contact-status" style="font-size: 12px; color: #dc2626; min-height: 16px; text-align: center; margin-top: 8px;"></p>
        </div>
      </div>
    `;

    const submitBtn = container.querySelector('#contact-submit-btn');
    const statusEl = container.querySelector('#contact-status');
    const formWrapper = container.querySelector('#contact-form-wrapper');

    const inputs = container.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => { input.style.borderColor = '#4f46e5'; input.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)'; });
      input.addEventListener('blur', () => { input.style.borderColor = '#d1d5db'; input.style.boxShadow = 'none'; });
    });

    submitBtn.addEventListener('click', async () => {
      const name = container.querySelector('#contact-name').value;
      const email = container.querySelector('#contact-email').value;
      const message = container.querySelector('#contact-message').value;

      if (!name || !email || !message) {
        statusEl.innerText = 'Please fill out all fields.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Sending...';
      statusEl.innerText = '';

      try {
        const res = await fetch(`${apiHost}/api/contact/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateToken, name, email, message }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send message.');
        }

        formWrapper.innerHTML = `
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px;">
            <svg style="width: 48px; height: 48px; color: #16a34a; margin-bottom: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 style="font-size: 22px; font-weight: 600; margin: 0; color: #111827;">Message Sent!</h3>
            <p style="font-size: 14px; color: #6b7280; margin-top: 8px;">Thanks for reaching out. We'll get back to you soon.</p>
          </div>
        `;

      } catch (error) {
        statusEl.innerText = error.message;
        submitBtn.disabled = false;
        submitBtn.innerText = 'Send Message';
      }
    });
  }

  function renderFounderProfile(props) {
    const { name, title, bio, imageUrl } = props || {};
    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 320px; box-sizing: border-box; margin: auto; text-align: center;">
        <div style="width: 96px; height: 96px; border-radius: 50%; background: #e5e7eb; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          ${imageUrl ? `<img src="${imageUrl}" alt="Founder" style="width: 100%; height: 100%; object-fit: cover;" />` : `<svg xmlns="http://www.w3.org/2000/svg" style="height: 48px; width: 48px; color: #9ca3af;" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>`}
        </div>
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 4px; color: #111827;">${name || 'Founder Name'}</h3>
        <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">${title || 'Founder & CEO'}</p>
        <p style="margin: 0; font-size: 14px; color: #4b5563; font-style: italic;">${bio ? `"${bio}"` : '"A short, impactful quote or bio goes here."'}</p>
      </div>
    `;
  }

  function renderChatbot(data) {
    const { componentProps } = data;
    const { welcomeMessage, initialQuestions } = componentProps || {};

    // --- Styles ---
    const styles = `
      #chatbot-fab { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background-color: #4f46e5; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out; z-index: 9998; }
      #chatbot-fab:hover { transform: scale(1.1); }
      #chatbot-fab.chatbot-hidden { transform: scale(0); opacity: 0; }
      #chatbot-fab svg { color: white; width: 32px; height: 32px; }
      #chatbot-window { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; background-color: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; z-index: 9999; transform: scale(0.95); opacity: 0; transition: transform 0.2s ease-out, opacity 0.2s ease-out; pointer-events: none; }
      #chatbot-window.open { transform: scale(1); opacity: 1; pointer-events: auto; }
      #chatbot-header { display: flex; justify-content: space-between; align-items: center; background-color: #4f46e5; color: white; padding: 12px 16px; font-weight: 600; flex-shrink: 0; }
      #chatbot-close-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; line-height: 1; padding: 0 4px; opacity: 0.8; }
      #chatbot-close-btn:hover { opacity: 1; }
      #chatbot-messages { flex-grow: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; }
      .chat-message { max-width: 80%; padding: 10px 14px; border-radius: 18px; margin-bottom: 10px; line-height: 1.4; }
      .chat-message.user { background-color: #eef2ff; color: #3730a3; align-self: flex-end; margin-left: auto; }
      .chat-message.ai { background-color: #f3f4f6; color: #1f2937; align-self: flex-start; }
      #chatbot-input-area { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; display: flex; gap: 10px; flex-shrink: 0; }
      #chatbot-input { flex-grow: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; font-size: 14px; }
      #chatbot-send-btn { background-color: #4f46e5; border: none; color: white; border-radius: 6px; padding: 0 16px; cursor: pointer; }
      #chatbot-initial-questions { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
      .initial-question-btn { background-color: transparent; border: 1px solid #d1d5db; color: #374151; padding: 8px 12px; border-radius: 16px; cursor: pointer; text-align: left; font-size: 13px; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- HTML Structure ---
    const fab = document.createElement('div');
    fab.id = 'chatbot-fab';
    fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>`;
    
    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatbot-window';
    chatWindow.innerHTML = `
      <div id="chatbot-header">
        <span>AI Assistant</span>
        <button id="chatbot-close-btn" title="Close chat">&times;</button>
      </div>
      <div id="chatbot-messages"></div>
      <div id="chatbot-input-area">
        <input id="chatbot-input" type="text" placeholder="Ask anything..." />
        <button id="chatbot-send-btn">Send</button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(chatWindow);

    // --- State & Logic ---
    const messagesContainer = chatWindow.querySelector('#chatbot-messages');
    const input = chatWindow.querySelector('#chatbot-input');
    const sendBtn = chatWindow.querySelector('#chatbot-send-btn');
    const closeBtn = chatWindow.querySelector('#chatbot-close-btn');
    let conversationHistory = [{ role: 'system', content: 'You are a helpful assistant.' }];

    const addMessage = (text, sender) => {
      const messageEl = document.createElement('div');
      messageEl.className = `chat-message ${sender}`;
      messageEl.innerText = text;
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const handleSend = async (messageText) => {
      if (!messageText.trim()) return;
      
      addMessage(messageText, 'user');
      conversationHistory.push({ role: 'user', content: messageText });
      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;

      // Show thinking indicator
      const thinkingEl = document.createElement('div');
      thinkingEl.className = 'chat-message ai';
      thinkingEl.innerText = '...';
      messagesContainer.appendChild(thinkingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        const res = await fetch(`${apiHost}/api/chatbot/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get response.');
        
        thinkingEl.remove();
        addMessage(data.reply, 'ai');
        conversationHistory.push({ role: 'assistant', content: data.reply });

      } catch (error) {
        thinkingEl.innerText = `Error: ${error.message}`;
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    };

    // Initial welcome message
    addMessage(welcomeMessage || 'Hello! How can I help you today?', 'ai');

    // Initial questions
    if (initialQuestions && initialQuestions.length > 0) {
      const questionsContainer = document.createElement('div');
      questionsContainer.id = 'chatbot-initial-questions';
      questionsContainer.innerHTML = initialQuestions.map(q => `<button class="initial-question-btn">${q}</button>`).join('');
      messagesContainer.appendChild(questionsContainer);
      
      questionsContainer.querySelectorAll('.initial-question-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          handleSend(btn.innerText);
          questionsContainer.remove();
        });
      });
    }

    // --- Event Listeners ---
    fab.addEventListener('click', () => {
      chatWindow.classList.add('open');
      fab.classList.add('chatbot-hidden');
    });
    closeBtn.addEventListener('click', () => {
      chatWindow.classList.remove('open');
      fab.classList.remove('chatbot-hidden');
    });
    sendBtn.addEventListener('click', () => handleSend(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend(input.value);
    });
  }

  // --- Main Execution Logic ---

  try {
    container.innerText = 'Loading...';

    const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4').then(FingerprintJS => FingerprintJS.load());
    const fpResult = await fpPromise.then(fp => fp.get());
    const fingerprint = fpResult.visitorId;

    const res = await fetch(`${apiHost}/api/embed/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        templateToken, 
        fingerprint,
        userId: script.dataset.userId,
        email: script.dataset.userEmail,
        name: script.dataset.userName,
        role: script.dataset.userRole,
        origin: window.location.origin
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to load embed.");
    }

    const data = await res.json();
    
    if (data.componentType === 'mobile_otp' || (data.componentType === 'qr_auth' && data.mobileOtpEnabled && isMobile())) {
      renderMobileAuth(data);
    } else {
      switch (data.componentType) {
        case 'pricing_card':
          renderPricingCard(data.componentProps);
          break;
        case 'magic_link':
          renderMagicLinkAuth(data);
          break;
        case 'social_login':
          renderSocialLogin(data);
          break;
        case 'contact_form':
          renderContactForm(data);
          break;
        case 'founder_profile':
          renderFounderProfile(data.componentProps);
          break;
        case 'chatbot':
          renderChatbot(data);
          break;
        case 'qr_auth':
        default:
          if (!data.qrDataUrl && !data.credentialsEnabled && (!data.socialProviders || data.socialProviders.length === 0) && !data.mobileOtpEnabled) {
            throw new Error("No auth methods configured for this embed.");
          }
          renderQrAuth(data);
          break;
      }
    }

  } catch (error) {
    console.error("Embed Script Error:", error);
    container.style.color = '#dc2626'; // Red 600
    container.innerText = error.message || "Could not load component.";
  }
})();