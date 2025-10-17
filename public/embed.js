(async () => {
  const qrContainer = document.getElementById("qr-embed-container");
  if (!qrContainer) {
    console.error("QR Embed: Container with id 'qr-embed-container' not found.");
    return;
  }

  const context = qrContainer.dataset.context || "default";
  const apiHost = qrContainer.dataset.host;

  if (!apiHost) {
    console.error("QR Embed: 'data-host' attribute is missing from the container.");
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

        const res = await fetch(`${apiHost}/api/embed/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint, context }),
        });

        if (!res.ok) {
          throw new Error("Failed to initialize session.");
        }

        const data = await res.json();
        displayQR(data.qrDataUrl);

        // Dispatch a custom event with the session token
        const event = new CustomEvent('qrEmbedLoaded', {
          bubbles: true, // Ensure the event can be caught by parent elements
          detail: { token: data.token }
        });
        qrContainer.dispatchEvent(event);

        // Optional: Set up SSE for real-time status updates on the embedded page
        const evtSource = new EventSource(`${apiHost}/api/events?token=${data.token}`);
        evtSource.onmessage = (e) => {
          const event = JSON.parse(e.data);
          if (event.state === "verified") {
            qrContainer.innerHTML = '<p style="font-family: sans-serif; color: green;">Connected!</p>';
            evtSource.close();
          }
        };
        evtSource.onerror = () => {
          // You might want to handle SSE errors, maybe just log them
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