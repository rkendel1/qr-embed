
import Head from 'next/head';
import withAuth from '@/auth/withAuth';

function AdminDashboard() {
  return (
    <>
      <Head>
        <title>Admin Dashboard - unhappyapp</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-4 text-gray-600">
          This is a protected page for administrators. Your access is controlled by the Route Permissions you configured in the QR-Embed dashboard.
        </p>
      </div>
    </>
  );
}

export default withAuth(AdminDashboard);
    