/**
 * QR Embed SSO Connector
 * Version 1.1.0
 * 
 * This script handles the client-side part of the Single Sign-On (SSO) flow.
 * It should be placed on the page that will receive the authentication token.
 * 
 * How it works:
 * 1. It checks the URL for a `token` query parameter.
 * 2. If a token is found, it redirects the user to a server-side login handler.
 * 3. The server-side handler verifies the token, sets a session cookie, and redirects to the final destination.
 * 
 * Usage:
 * <script 
 *   src="https://[YOUR_DOMAIN]/sso-connector.js" 
 *   data-success-redirect="/dashboard"      // Where to redirect the user after successful login
 *   data-target-div="sso-status"            // The ID of a div to show status messages in
 *   defer>
 * </script>
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const script = document.currentScript || document.querySelector('script[src*="sso-connector.js"]');
    
    if (!script) {
      console.error("SSO Connector: Could not find the script tag. Aborting.");
      return;
    }

    const successRedirect = script.dataset.successRedirect;
    const targetDivId = script.dataset.targetDiv;
    const statusContainer = document.getElementById(targetDivId);

    if (!successRedirect || !statusContainer) {
      console.error("SSO Connector: Missing required data attributes (data-success-redirect, data-target-div).");
      if (statusContainer) {
        statusContainer.innerHTML = '<p style="color: red;">SSO Connector configuration error.</p>';
      }
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      console.log("SSO Connector: No token found in URL. Script will do nothing.");
      if (statusContainer) statusContainer.style.display = 'none';
      return;
    }

    console.log("SSO Connector: Token found. Redirecting to login handler.");
    if (statusContainer) {
      statusContainer.innerHTML = '<p>Authenticating, please wait...</p>';
    }
    
    const loginUrl = new URL('/api/sso-login', window.location.origin);
    loginUrl.searchParams.set('token', token);
    loginUrl.searchParams.set('redirectUrl', successRedirect);

    // Forcefully redirect the browser to the login handler.
    window.location.href = loginUrl.toString();
  });
})();