(async () => {
  const script = document.currentScript;
  if (!script) {
    console.error("QR Embed: Could not find the executing script tag.");
    return;
  }

  // Create main container for QR and status text
  const mainContainer = document.createElement('div');
  mainContainer.style.fontFamily = 'sans-serif';
  mainContainer.style.color = '#555';
  mainContainer.style.display = 'flex';
  mainContainer.style.flexDirection = 'column';
  mainContainer.style.alignItems = 'center';
  mainContainer.style.gap = '12px';
  
  const qrContainer = document.createElement('div');
  qrContainer.style.width = '150px';
  qrContainer.style.height = '150px';
  
  const statusContainer = document.createElement('p');
  statusContainer.style.margin = '0';
  statusContainer.style.fontSize = '14px';
  statusContainer.style.minHeight = '20px'; // Prevent layout shift
  statusContainer.style.textAlign = 'center';

  mainContainer.appendChild(qrContainer);
  mainContainer.appendChild(statusContainer);
  script.parentNode.insertBefore(mainContainer, script);

  const templateToken = script.dataset.token;
  const apiHost = script.dataset.host;
  const userId = script.dataset.userId; // Capture the user ID

  if (!apiHost) {
    console.error("QR Embed: 'data-host' attribute is missing from the script tag.");
    statusContainer.innerText = "Configuration error.";
    return;
  }

  if (!templateToken) {
    console.error("QR Embed: 'data-token' attribute is missing from the script tag.");
    statusContainer.innerText = "Configuration error.";
    return;
  }

  function showLoading() {
    statusContainer.innerText = 'Loading QR Code...';
  }

  function showError(message) {
    statusContainer.style.color = '#c00';
    statusContainer.innerText = message;
  }

  function displayQR(qrDataUrl) {
    const img = document.createElement("img");
    img.src = qrDataUrl;
    img.style.width = "150px";
    img.style.height = "150px";
    qrContainer.innerHTML = ''; // Clear previous content
    qrContainer.appendChild(img);
  }

  try {
    showLoading();

    // Use modern, faster FingerprintJS via their CDN
    const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4')
      .then(FingerprintJS => FingerprintJS.load());

    fpPromise
      .then(fp => fp.get())
      .then(async (result) => {
        const fingerprint = result.visitorId;

        try {
          const res = await fetch(`${apiHost}/api/embed/load`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ templateToken, fingerprint, userId, origin: apiHost }),
          });

          if (!res.ok) {
            if (res.status === 403) {
              throw new Error("This QR code is no longer active. Please contact the website owner for assistance.");
            }
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to load session.");
          }

          const data = await res.json();
          displayQR(data.qrDataUrl);

          const sessionToken = data.sessionToken;

          const event = new CustomEvent('qrEmbedLoaded', {
            bubbles: true,
            detail: { token: sessionToken }
          });
          mainContainer.dispatchEvent(event);

          const evtSource = new EventSource(`${apiHost}/api/events?token=${sessionToken}`);
          
          evtSource.onmessage = (e) => {
            const event = JSON.parse(e.data);
            console.log('QR Embed: Received state update:', event);

            switch (event.state) {
              case 'init':
              case 'loaded':
                statusContainer.innerText = 'Scan the QR code to connect.';
                statusContainer.style.color = '#555';
                break;
              case 'scanned':
                statusContainer.innerText = 'Scanned! Please approve on your device.';
                statusContainer.style.color = '#d97706'; // Amber 600
                break;
              case 'verified':
                if (event.successUrl) {
                  const target = window.top || window;
                  try {
                    target.location.replace(event.successUrl);
                  } catch (e) {
                    console.error("QR Embed: Could not redirect top window, redirecting self.", e);
                    window.location.replace(event.successUrl);
                  }
                } else {
                  mainContainer.innerHTML = ''; // Clear old content
                  const successMessage = document.createElement('div');
                  successMessage.style.display = 'flex';
                  successMessage.style.flexDirection = 'column';
                  successMessage.style.alignItems = 'center';
                  successMessage.style.justifyContent = 'center';
                  successMessage.style.height = '170px'; // Match old container height
                  successMessage.innerHTML = '<p style="font-family: sans-serif; color: #16a34a; font-size: 16px; font-weight: bold;">Connected!</p>';
                  mainContainer.appendChild(successMessage);
                }
                evtSource.close();
                break;
              default:
                statusContainer.innerText = 'Waiting for connection...';
            }
          };

          evtSource.onerror = () => {
            console.error("QR Embed: SSE connection error.");
            showError("Connection lost. Please refresh.");
            evtSource.close();
          };

        } catch (error) {
          console.error("QR Embed Error:", error);
          showError(error.message || "Could not load QR Code.");
        }
      })
      .catch(error => {
        console.error("QR Embed Error during fingerprinting:", error);
        showError("Could not initialize.");
      });

  } catch (error) {
    console.error("QR Embed Error:", error);
    showError("Could not load QR Code.");
  }
})();