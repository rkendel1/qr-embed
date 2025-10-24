
import Head from 'next/head';
import withAuth from '@/auth/withAuth';
import Can from '@/auth/Can';

function Dashboard() {
  return (
    <>
      <Head>
        <title>Dashboard - unhappyapp</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">User Dashboard</h1>
        <p className="mt-4 text-gray-600">
          You are logged in and can see this protected page.
        </p>
        
        <div className="mt-8 p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold">Permissions Demo</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Use the `<Can>` component to show or hide UI elements based on user permissions.
          </p>
          
          <Can permission="project:create">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="font-medium text-green-800">
                You have the 'project:create' permission! You can see this content.
              </p>
            </div>
          </Can>
          
          <Can permission="user:manage">
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="font-medium text-blue-800">
                You have the 'user:manage' permission! You can see this admin-only content.
              </p>
            </div>
          </Can>
        </div>
      </div>
    </>
  );
}

export default withAuth(Dashboard);
    