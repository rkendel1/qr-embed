/**
 * QR Embed SSO Connector
 * Version 1.0.0
 * 
 * This script handles the client-side part of the Single Sign-On (SSO) flow.
 * It should be placed on the page that will receive the authentication token.
 * 
 * How it works:
 * 1. It checks the URL for a `token` query parameter.
 * 2. If a token is found, it sends it to a verification endpoint on your server.
 * 3. It handles the response, redirecting on success or showing an error on failure.
 * 
 * Usage:
 * <script 
 *   src="https://[YOUR_DOMAIN]/sso-connector.js" 
 *   data-verify-url="/api/auth/sso-verify"  // The URL of your backend verification endpoint
 *   data-success-redirect="/dashboard"      // Where to redirect the user after successful login
 *   data-target-div="sso-status"            // The ID of a div to show status messages in
 *   defer>
 * </script>
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const script = document.currentScript || document.querySelector('script[src*="sso-connector.js"]');
    
    const verifyUrl = script.dataset.verifyUrl;
    const successRedirect = script.dataset.successRedirect;
    const targetDivId = script.dataset.targetDiv;

    const statusContainer = document.getElementById(targetDivId);

    if (!verifyUrl || !successRedirect || !statusContainer) {
      console.error("SSO Connector: Missing required data attributes (data-verify-url, data-success-redirect, data-target-div).");
      if (statusContainer) {
        statusContainer.innerHTML = '<p style="color: red;">SSO Connector configuration error. Please check the script tag.</p>';
      }
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      // No token found, so we do nothing. The page can render as normal.
      statusContainer.style.display = 'none';
      return;
    }

    // Token found, so we initiate the verification process.
    statusContainer.innerHTML = '<p>Authenticating, please wait...</p>';
    
    fetch(`${verifyUrl}?token=${encodeURIComponent(token)}`)
      .then(response => {
        if (response.ok) {
          // The server-side verification was successful.
          // The server should have set a session cookie. Now we redirect.
          window.location.href = successRedirect;
        } else {
          // The server rejected the token.
          return response.text().then(text => {
            throw new Error(text || 'Authentication failed.');
          });
        }
      })
      .catch(error => {
        console.error('SSO Error:', error);
        statusContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
      });
  });
})();