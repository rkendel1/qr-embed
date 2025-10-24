import Head from 'next/head';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <>
      <Head>
        <title>Access Denied</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h1 className="text-2xl font-bold text-red-600 mt-4 mb-2">Access Denied</h1>
          <p className="text-gray-800">
            You do not have the necessary permissions to view this page.
          </p>
          <div className="mt-6">
            <Link href="/dashboard" className="w-full inline-flex justify-center px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}