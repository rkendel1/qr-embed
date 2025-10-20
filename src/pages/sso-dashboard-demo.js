import Head from 'next/head';
import withAuth from '@/auth/withAuth';
import { useAuth } from '@/auth/useAuth';

function SsoDashboardDemo() {
  const { user, logout } = useAuth();

  return (
    <>
      <Head>
        <title>SSO Protected Page</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-green-600 mb-4">
              Authentication Successful!
            </h1>
            <p className="text-gray-800">
              Welcome, <span className="font-semibold">{user.name}</span>!
            </p>
            <p className="text-gray-600 text-sm mt-2">
              (User ID: {user.id})
            </p>
            <p className="mt-4">
              This page is protected. You are seeing it because you have a valid session.
            </p>
          </div>
          <div className="mt-6">
            <button
              onClick={logout}
              className="w-full px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Wrap the component with the HOC to protect it
export default withAuth(SsoDashboardDemo);