
import Head from 'next/head';
import { useEffect, useState } from 'react';
import EmbedLoader from '@/components/EmbedLoader';

export default function LoginPage() {
  const [embedToken, setEmbedToken] = useState('');
  const [apiHost, setApiHost] = useState('');

  useEffect(() => {
    setEmbedToken(process.env.NEXT_PUBLIC_EMBED_TOKEN);
    setApiHost(process.env.NEXT_PUBLIC_QR_EMBED_URL);
  }, []);

  return (
    <>
      <Head>
        <title>Login - unhappyapp</title>
      </Head>
      <div className="max-w-md mx-auto mt-16">
        {embedToken && apiHost ? (
          <EmbedLoader
            apiHost={apiHost}
            token={embedToken}
            targetId="qr-embed-container"
          />
        ) : (
          <div className="text-center p-8 bg-white shadow rounded-lg">
            <h2 className="text-xl font-bold text-red-600">Configuration Missing</h2>
            <p className="mt-2 text-gray-700">
              Please set the `NEXT_PUBLIC_EMBED_TOKEN` in your `.env.local` file to see the login component.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
    