import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function VerifyMagicLinkPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState('Verifying your link...');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch('/api/magic-link/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ magicToken: token }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Verification failed. The link may be invalid or expired.');
        }

        setStatus('Success! Redirecting you now...');
        // The API response includes the final destination URL, which might be an SSO login URL
        window.location.replace(data.successUrl);

      } catch (err) {
        console.error('Magic link verification error:', err);
        setError(err.message);
        setStatus('Verification Failed');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <>
      <Head>
        <title>Verifying Login</title>
      </Head>
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{status}</h2>
          {error ? (
            <p className="text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          ) : (
            <p className="text-gray-600">Please wait, we are securely logging you in.</p>
          )}
        </div>
      </div>
    </>
  );
}