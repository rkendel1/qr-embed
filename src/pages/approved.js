import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ApprovedPage() {
  const router = useRouter();
  const { redirectUrl } = router.query;

  return (
    <>
      <Head>
        <title>Connection Approved</title>
      </Head>
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md text-center max-w-sm w-full">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-800">Connection Approved!</h2>
          <p className="mt-2 text-gray-600">
            Your devices are now connected. The original page should have redirected. You can safely close this window.
          </p>
          {redirectUrl && (
            <div className="mt-6">
              <a
                href={redirectUrl}
                className="w-full inline-flex justify-center px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Continue on this device
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}