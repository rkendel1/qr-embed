import Head from 'next/head';

import { useEffect, useState } from 'react';
import EmbedLoader from '@/components/EmbedLoader';

function SolutionsPage() {
  
  const [apiHost, setApiHost] = useState('');
  const [embedTokens, setEmbedTokens] = useState([]);

  useEffect(() => {
    setApiHost(process.env.NEXT_PUBLIC_QR_EMBED_URL);
    const tokens = (process.env.NEXT_PUBLIC_SOLUTIONS_EMBED_TOKENS || '').split(',').filter(Boolean);
    setEmbedTokens(tokens);
  }, []);
  

  return (
    <>
      <Head>
        <title>Solutions - sibin</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Solutions</h1>
        <p className="mt-4 text-gray-600">
          This is the Solutions page.
        </p>
        
        <div className="mt-8 space-y-8 flex flex-col items-center">
          {embedTokens.map((token, index) => (
            <EmbedLoader key={token} apiHost={apiHost} token={token} targetId={`embed-container-${index}`} />
          ))}
        </div>
    
      </div>
    </>
  );
}

export default SolutionsPage;