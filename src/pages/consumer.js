import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ConsumerPage() {
  const [origin, setOrigin] = useState('');

  // We need to get the window.location.origin on the client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <>
      {/* 
        This adds the embed.js script to the page's head.
        It will only run after the 'origin' is set.
      */}
      {origin && (
        <Head>
          <script src={`${origin}/embed.js`} defer></script>
        </Head>
      )}
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-gray-800">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
          <header className="border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold">Welcome to Our Website!</h1>
            <p className="text-gray-600 mt-2">
              This page simulates a third-party website that has embedded the QR connection widget.
            </p>
          </header>
          
          <main>
            <h2 className="text-2xl font-semibold mb-4">Connect Your Mobile Device</h2>
            <p className="text-gray-600 mb-6">
              To securely link your mobile device to your session on this website, please scan the QR code below.
            </p>
            
            <div className="border rounded-lg p-6 bg-gray-50 flex items-center justify-center min-h-[200px]">
              {/* 
                This is the container div that embed.js looks for.
                The script will find this div and load the QR code inside it.
              */}
              {origin ? (
                <div id="qr-embed-container" data-context="consumer-page-demo" data-host={origin}></div>
              ) : (
                <p className="text-gray-500">Loading Embed...</p>
              )}
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