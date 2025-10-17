(async () => {
    const qrContainer = document.getElementById("qr");
    if (!qrContainer) return;
  
    // Get session from global window (set by Next.js page)
    const session = window.sessionData;
    if (!session) return;
  
    const img = document.createElement("img");
    img.src = session.qrDataUrl;
    img.style.width = "150px";
    qrContainer.appendChild(img);
  
    // Minimal PAR hook
    window.getAssistanceLevel = () => {
      const score = 0; // stub
      if (score < 30) return "high";
      if (score < 70) return "medium";
      return "low";
    };
  })();
  