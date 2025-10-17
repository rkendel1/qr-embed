(async () => {
  const qrContainer = document.getElementById("qr-embed-container");
  if (!qrContainer) {
    console.error("QR Embed: Container with id 'qr-embed-container' not found.");
    return;
  }

  const token = qrContainer.dataset.token;
  const apiHost = qrContainer.dataset.host;

  if (!apiHost) {
    console.error("QR Embed: 'data-host' attribute is missing from the container.");
    return;
  }

  if (!token) {
    console.error("QR Embed: 'data-token' attribute is missing from the container.");
    return;
  }

  function showLoading() {
    qrContainer.innerHTML = '<p style="font-family: sans-serif; color: #555;">Loading QR Code...</p>';
  }

  function showError(message) {
    qrContainer.innerHTML = `<p style="font-family: sans-serif; color: #c00;">${message}</p>`;
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
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/fingerprintjs2/2.1.4/fingerprint2.min.js";
    script.onload = async () => {
      try {
        const components = await Fingerprint2.getPromise();
        const fingerprint = components.map(c => c.value).join("");

        const res = await fetch(`${apiHost}/api/embed/load`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, fingerprint }),
        });

        if (!res.ok) {
          throw new Error("Failed to load session.");
        }

        const data = await res.json();
        displayQR(data.qrDataUrl);

        // Dispatch a custom event with the session token
        const event = new CustomEvent('qrEmbedLoaded', {
          bubbles: true,
          detail: { token: token }
        });
        qrContainer.dispatchEvent(event);

        // Optional: Set up SSE for real-time status updates on the embedded page
        const evtSource = new EventSource(`${apiHost}/api/events?token=${token}`);
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
    document.head.appendChild(script);

  } catch (error) {
    console.error("QR Embed Error:", error);
    showError("Could not load QR Code.");
  }
})();