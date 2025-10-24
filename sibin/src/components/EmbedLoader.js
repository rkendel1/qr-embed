
import { useEffect } from 'react';

export default function EmbedLoader({ apiHost, token, targetId }) {
  useEffect(() => {
    if (!apiHost || !token || !targetId) return;

    const container = document.getElementById(targetId);
    if (!container) return;

    const script = document.createElement('script');
    script.src = `${apiHost}/embed.js`;
    script.defer = true;
    script.dataset.token = token;
    script.dataset.host = apiHost;
    script.dataset.targetId = targetId;

    container.appendChild(script);

    // Cleanup function to remove the script and clear the container
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [apiHost, token, targetId]);

  return <div id={targetId} className="min-h-[400px] flex items-center justify-center"></div>;
}
    