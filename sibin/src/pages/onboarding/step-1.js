
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import withAuth from '@/auth/withAuth';

function OnboardingStep1() {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState(null);

  const handleFinish = async () => {
    setIsCompleting(true);
    setError(null);
    try {
      const res = await fetch('/api/users/complete-onboarding', {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save onboarding status.');
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setIsCompleting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Onboarding: Step 1 - unhappyapp</title>
      </Head>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Onboarding - Step 1 of 3</h1>
        <div className="mt-8 p-8 bg-white border rounded-lg min-h-[200px] flex items-center justify-center">
          <p className="text-gray-600">Your content for step 1 goes here.</p>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-8 flex justify-between">
          <div></div>
          <Link href="/onboarding/step-2" className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Next</Link>
        </div>
      </div>
    </>
  );
}

export default withAuth(OnboardingStep1);
    