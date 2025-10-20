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
    console.log("SSO Connector: DOMContentLoaded event fired.");
    const script = document.currentScript || document.querySelector('script[src*="sso-connector.js"]');
    
    if (!script) {
      console.error("SSO Connector: Could not find the script tag. Aborting.");
      return;
    }
    console.log("SSO Connector: Script tag found.", script.dataset);

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
    console.log("SSO Connector: Configuration is valid.");

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      console.log("SSO Connector: No token found in URL. Script will do nothing.");
      statusContainer.style.display = 'none';
      return;
    }

    console.log("SSO Connector: Token found:", token);
    statusContainer.innerHTML = '<p>Authenticating, please wait...</p>';
    
    console.log(`SSO Connector: Fetching verification URL: ${verifyUrl}`);
    fetch(`${verifyUrl}?token=${encodeURIComponent(token)}`)
      .then(response => {
        console.log("SSO Connector: Received response from verification URL.", response);
        if (response.ok) {
          console.log("SSO Connector: Verification successful. Redirecting to:", successRedirect);
          window.location.href = successRedirect;
        } else {
          console.error("SSO Connector: Verification failed.");
          return response.text().then(text => {
            throw new Error(text || 'Authentication failed.');
          });
        }
      })
      .catch(error => {
        console.error('SSO Connector: Fetch error:', error);
        statusContainer.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
      });
  });
})();