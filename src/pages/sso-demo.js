import Head from 'next/head';
import Script from 'next/script';

export default function SsoDemoPage() {
  const origin = process.env.NEXT_PUBLIC_APP_URL || '';

  return (
    <>
      <Head>
        <title>SSO Destination Demo</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Welcome to the Destination Site
          </h1>
          
          {/* This is where the SSO status will be displayed by the connector script */}
          <div id="sso-status" className="text-center text-gray-600 my-4">
            <p>
              This is a regular page on the destination website. If you were redirected here with a valid token, our SSO script will automatically log you in.
            </p>
          </div>

          <div className="text-center mt-6">
            <a href="/sso-dashboard-demo" className="text-indigo-600 hover:underline">
              Go to Protected Page
            </a>
          </div>
        </div>
      </div>

      {/* 
        This is the "low-code" part for your clients.
        They just need to add this script tag to their login/callback page.
      */}
      <Script
        src="/sso-connector.js"
        data-success-redirect="/sso-dashboard-demo"
        data-target-div="sso-status"
        defer
      />
    </>
  );
}