
import Head from 'next/head';
import { useEffect, useState } from 'react';
import EmbedLoader from '@/components/EmbedLoader';

export default function PricingPage() {
  const [paymentTokens, setPaymentTokens] = useState([]);
  const [apiHost, setApiHost] = useState('');

  useEffect(() => {
    setApiHost(process.env.NEXT_PUBLIC_QR_EMBED_URL);
    const tokens = (process.env.NEXT_PUBLIC_PAYMENT_EMBED_TOKENS || '').split(',').filter(Boolean);
    setPaymentTokens(tokens);
  }, []);

  return (
    <>
      <Head>
        <title>Pricing - unhappyapp</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900">Our Pricing</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-600">
            Choose the plan that's right for you.
          </p>
        </div>
        
        <div className="mt-12 flex flex-wrap justify-center items-start gap-8">
          {paymentTokens.length > 0 && apiHost ? (
            paymentTokens.map((token, index) => (
              <EmbedLoader
                key={token}
                apiHost={apiHost}
                token={token}
                targetId={`payment-embed-${index}`}
              />
            ))
          ) : (
            <p className="text-gray-500">Pricing plans are not configured. Please set NEXT_PUBLIC_PAYMENT_EMBED_TOKENS in your .env.local file.</p>
          )}
        </div>
      </div>
    </>
  );
}
    