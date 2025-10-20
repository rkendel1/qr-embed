import Head from 'next/head';
import { parse } from 'cookie';

export default function SsoDashboardDemo({ user }) {
  return (
    <>
      <Head>
        <title>SSO Protected Page</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
          {user ? (
            <div>
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
                This page confirms that the SSO flow worked and your site has successfully created a session.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Access Denied
              </h1>
              <p className="text-gray-800">
                You are not logged in. Please go through the authentication flow to access this page.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const cookies = context.req.headers.cookie ? parse(context.req.headers.cookie) : {};
  const authCookie = cookies['demo-auth'];

  let user = null;
  if (authCookie) {
    try {
      user = JSON.parse(authCookie);
    } catch (e) {
      console.error("Failed to parse auth cookie:", e);
    }
  }

  return {
    props: {
      user,
    },
  };
}