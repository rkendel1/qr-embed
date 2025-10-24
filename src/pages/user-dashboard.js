import Head from 'next/head';
import withAuth from '@/auth/withAuth';
import { useAuth } from '@/auth/useAuth';

function UserDashboard() {
  const { user, logout } = useAuth();

  return (
    <>
      <Head>
        <title>User Dashboard</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-600 mb-4">
              Welcome to the User Dashboard
            </h1>
            <p className="text-gray-800">
              This is a protected page for regular users.
            </p>
            {user && (
              <div className="text-gray-600 text-sm mt-2 space-y-1">
                <p>User ID: <span className="font-semibold">{user.id}</span></p>
                <p>Role: <span className="font-semibold capitalize">{user.role || 'N/A'}</span></p>
              </div>
            )}
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

export default withAuth(UserDashboard);