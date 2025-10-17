(async () => {
  const script = document.currentScript;
  if (!script) {
    console.error("QR Embed: Could not find the executing script tag.");
    return;
  }

  const qrContainer = document.createElement('div');
  qrContainer.style.fontFamily = 'sans-serif';
  qrContainer.style.color = '#555';
  script.parentNode.insertBefore(qrContainer, script);

  const templateToken = script.dataset.token;
  const apiHost = script.dataset.host;

  if (!apiHost) {
    console.error("QR Embed: 'data-host' attribute is missing from the script tag.");
    qrContainer.innerText = "Configuration error.";
    return;
  }

  if (!templateToken) {
    console.error("QR Embed: 'data-token' attribute is missing from the script tag.");
    qrContainer.innerText = "Configuration error.";
    return;
  }

  function showLoading() {
    qrContainer.innerText = 'Loading QR Code...';
  }

  function showError(message) {
    qrContainer.style.color = '#c00';
    qrContainer.innerText = message;
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

    // Dynamically import fingerprintjs2
    const fpScript = document.createElement('script');
    fpScript.src = "https://cdnjs.cloudflare.com/ajax/libs/fingerprintjs2/2.1.4/fingerprint2.min.js";
    fpScript.onload = async () => {
      try {
        const components = await Fingerprint2.getPromise();
        const fingerprint = components.map(c => c.value).join("");

        const res = await fetch(`${apiHost}/api/embed/load`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateToken, fingerprint }),
        });

        if (!res.ok) {
          throw new Error("Failed to load session.");
        }

        const data = await res.json();
        displayQR(data.qrDataUrl);

        const sessionToken = data.sessionToken;

        // Notify the server that the QR code has been loaded and displayed
        try {
          await fetch(`${apiHost}/api/session/loaded`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: sessionToken }),
          });
        } catch (e) {
          console.warn("QR Embed: Could not notify server of QR load.", e);
        }

        const event = new CustomEvent('qrEmbedLoaded', {
          bubbles: true,
          detail: { token: sessionToken }
        });
        qrContainer.dispatchEvent(event);

        const evtSource = new EventSource(`${apiHost}/api/events?token=${sessionToken}`);
        evtSource.onmessage = (e) => {
          const event = JSON.parse(e.data);
          if (event.state === "verified") {
            qrContainer.innerHTML = '<p style="font-family: sans-serif; color: green;">Connected!</p>';
            evtSource.close();
          }
        };
        evtSource.onerror = () => {
          console.error("SSE connection error.");
          evtSource.close();
        };

      } catch (error) {
        console.error("QR Embed Error:", error);
        showError("Could not load QR Code.");
      }
    };
    document.head.appendChild(fpScript);

  } catch (error) {
    console.error("QR Embed Error:", error);
    showError("Could not load QR Code.");
  }
})();