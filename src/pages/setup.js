import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function SetupPage() {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/setup/initialize-db', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'An unknown error occurred.');
      }
      setStatus('success');
      setMessage(data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <>
      <Head>
        <title>Setup Application</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Setup</h1>
          <p className="text-gray-600 mb-8">
            Welcome! It looks like this is a fresh installation. Before you can use the dashboard, the database needs to be initialized.
          </p>

          {status === 'idle' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">This will create all necessary tables and seed default roles.</p>
              <button
                onClick={handleInitialize}
                className="w-full max-w-xs px-6 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Initialize Database
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex items-center justify-center space-x-3">
              <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-lg font-medium text-gray-700">Initializing, please wait...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-xl font-bold text-green-800 mb-2">Setup Complete!</h2>
              <p className="text-green-700 mb-6">{message}</p>
              <Link href="/dashboard" className="inline-block px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                Go to Dashboard
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
              <h2 className="text-xl font-bold text-red-800 mb-2">An Error Occurred</h2>
              <p className="text-red-700 font-mono bg-red-100 p-3 rounded-md text-sm">{message}</p>
              <p className="mt-4 text-sm text-gray-600">
                Please check your server console for more details. This usually happens if the environment variables (e.g., Supabase keys) are incorrect or if the database has already been set up.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}