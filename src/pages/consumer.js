import { useState, useRef } from 'react';
import Head from 'next/head';

export default function ConsumerPage() {
  const [pastedCode, setPastedCode] = useState('');
  const embedTargetRef = useRef(null);

  const handleLoadEmbed = () => {
    if (!pastedCode || !embedTargetRef.current) return;

    // Clear previous content and remove the old script if it exists
    embedTargetRef.current.innerHTML = '';
    const oldScript = document.getElementById('qr-embed-script');
    if (oldScript) {
      oldScript.remove();
    }

    // Use a temporary div to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pastedCode;

    const qrContainerDiv = tempDiv.querySelector('#qr-embed-container');
    const scriptTag = tempDiv.querySelector('script');

    if (!qrContainerDiv || !scriptTag || !scriptTag.src) {
      embedTargetRef.current.innerHTML = '<p class="text-red-500">Invalid or incomplete embed code. Please paste the full snippet.</p>';
      return;
    }

    // Append the HTML part (the div)
    embedTargetRef.current.appendChild(qrContainerDiv);

    // Create and append a new script tag to make it execute
    const newScript = document.createElement('script');
    for (let i = 0; i < scriptTag.attributes.length; i++) {
      const attr = scriptTag.attributes[i];
      newScript.setAttribute(attr.name, attr.value);
    }
    newScript.id = 'qr-embed-script'; // Add an ID for easy removal later
    document.head.appendChild(newScript);
  };

  return (
    <>
      <Head>
        <title>Consumer Demo Page</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-gray-800">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
          <header className="border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold">Consumer Website Simulation</h1>
            <p className="text-gray-600 mt-2">
              This page simulates a third-party website where you can paste and load the QR embed code.
            </p>
          </header>
          
          <main>
            <h2 className="text-2xl font-semibold mb-4">1. Paste Embed Code</h2>
            <p className="text-gray-600 mb-4">
              Go to the <a href="/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Dashboard</a>, generate an embed code, and paste it into the text area below.
            </p>
            
            <textarea
              className="w-full h-32 p-3 bg-gray-800 text-green-400 font-mono text-sm border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={pastedCode}
              onChange={(e) => setPastedCode(e.target.value)}
              placeholder='<div id="qr-embed-container" data-context="..." data-host="..."></div>\n<script src=".../embed.js" defer></script>'
            />
            <button
              onClick={handleLoadEmbed}
              disabled={!pastedCode}
              className="mt-4 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              2. Load Embed
            </button>

            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Live Preview</h2>
            <div className="border rounded-lg p-6 bg-gray-50 flex items-center justify-center min-h-[200px]">
              <div ref={embedTargetRef}>
                <p className="text-gray-500">Embed will appear here after loading.</p>
              </div>
            </div>
          </main>

          <footer className="mt-8 pt-4 border-t text-center text-gray-500 text-sm">
            <p>&copy; 2024 Demo Website Inc.</p>
          </footer>
        </div>
      </div>
    </>
  );
}