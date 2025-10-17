import { useState, useRef } from 'react';
import Head from 'next/head';

export default function ConsumerTestPage() {
  const [embedCode, setEmbedCode] = useState('');
  const containerRef = useRef(null);

  const handleLoadEmbed = () => {
    if (!containerRef.current || !embedCode.trim()) return;

    // Clear previous embed
    containerRef.current.innerHTML = '';

    // This is a simple way to parse the script tag string to get its attributes.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = embedCode;
    const oldScript = tempDiv.querySelector('script');

    if (oldScript) {
      const newScript = document.createElement('script');
      // Copy all attributes from the pasted script tag to the new one
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }
      
      // Append the new, executable script to the container
      containerRef.current.appendChild(newScript);
    } else {
      containerRef.current.innerText = "Invalid script tag provided.";
    }
  };

  return (
    <>
      <Head>
        <title>Consumer Embed Tester</title>
      </Head>
      <div className="min-h-screen bg-gray-100 py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Embed Tester</h1>
          <p className="text-gray-600">Paste your embed code below to load and test it.</p>
        </header>
        <main className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <label htmlFor="embed-code" className="block text-sm font-medium text-gray-700 mb-2">
                Embed Script Tag
              </label>
              <textarea
                id="embed-code"
                rows="4"
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                placeholder={`<script src="..." data-token="..." ...><\/script>`}
                value={embedCode}
                onChange={(e) => setEmbedCode(e.target.value)}
              />
            </div>
            <button
              onClick={handleLoadEmbed}
              className="w-full px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Load Embed
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Rendered Output</h2>
            <div 
              ref={containerRef} 
              id="embed-container" 
              className="flex justify-center items-center bg-white p-8 rounded-lg shadow min-h-[250px]"
            >
              <p className="text-gray-500">Your embed will appear here.</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}