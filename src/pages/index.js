import Head from 'next/head';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>QR Embed - Seamless QR Code Authentication</title>
        <meta name="description" content="Easily integrate secure, cross-device login experiences with embeddable QR components." />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Hero Section */}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
              Seamless <span className="text-indigo-600">QR Code Authentication</span> for Your App
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600">
              Easily integrate secure, cross-device login experiences. Create your embeddable QR component in minutes and let your users connect with a simple scan.
            </p>
            <div className="mt-12">
              <Link href="/dashboard" className="inline-block px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Go to Dashboard
              </Link>
            </div>
          </div>

          {/* How it works Section */}
          <div className="mt-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
              <p className="mt-4 text-lg text-gray-600">
                Three simple steps to get up and running.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              <div className="bg-white p-8 rounded-lg shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">1. Create an Embed</h3>
                <p className="mt-2 text-base text-gray-500">
                  Use the dashboard to configure your QR component. Set redirection URLs and enable optional Single Sign-On (SSO) with JWT.
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">2. Add the Script</h3>
                <p className="mt-2 text-base text-gray-500">
                  Copy the generated one-line script tag and paste it into your application where you want the QR code to appear.
                </p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">3. Users Connect</h3>
                <p className="mt-2 text-base text-gray-500">
                  Your users scan the QR code on their desktop, approve the connection on their mobile device, and are seamlessly logged in.
                </p>
              </div>
            </div>
          </div>

          {/* Examples Section */}
          <div className="mt-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Embeddable Components</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                From secure authentication to simple pricing cards, our components are ready to drop into your app.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2 items-start justify-center">
              {/* QR Auth Example */}
              <div className="flex flex-col items-center">
                <div className="p-8 bg-white rounded-lg shadow-lg w-full max-w-sm">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">QR Authentication</h3>
                  <div className="flex justify-center">
                    <div style={{ fontFamily: 'sans-serif', color: '#555', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '150px', height: '150px' }}>
                        <svg width="150" height="150" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M0 0H40V10H10V40H0V0ZM10 10H30V30H10V10Z" fill="#4A5568"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M60 0H100V40H90V10H60V0ZM70 10H90V30H70V10Z" fill="#4A5568"/>
                          <path fillRule="evenodd" clipRule="evenodd" d="M0 60H40V90H10V60H0ZM10 70H30V90H10V70Z" fill="#4A5568"/>
                          <path d="M90 60H100V70H90V60Z" fill="#4A5568"/>
                          <path d="M60 90H70V100H60V90Z" fill="#4A5568"/>
                          <path d="M40 40H50V50H40V40Z" fill="#4A5568"/>
                          <path d="M50 50H60V60H50V50Z" fill="#4A5568"/>
                          <path d="M60 60H70V70H60V60Z" fill="#4A5568"/>
                          <path d="M70 70H80V80H70V70Z" fill="#4A5568"/>
                          <path d="M80 80H90V90H80V80Z" fill="#4A5568"/>
                          <path d="M90 90H100V100H90V90Z" fill="#4A5568"/>
                          <path d="M40 60H50V70H40V60Z" fill="#4A5568"/>
                          <path d="M50 70H60V80H50V70Z" fill="#4A5568"/>
                          <path d="M60 40H70V50H60V40Z" fill="#4A5568"/>
                          <path d="M70 50H80V60H70V50Z" fill="#4A5568"/>
                          <path d="M80 40H90V50H80V40Z" fill="#4A5568"/>
                          <path d="M90 50H100V60H90V50Z" fill="#4A5568"/>
                        </svg>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', minHeight: '20px', textAlign: 'center' }}>
                        Scan the QR code to connect.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Pricing Card Example */}
              <div className="flex flex-col items-center">
                <div className="p-8 bg-white rounded-lg shadow-lg w-full max-w-sm">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Pricing Card</h3>
                  <div className="flex justify-center">
                    <div style={{ fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: '8px', width: '100%', maxWidth: '320px', textAlign: 'center', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>Pro Plan</h3>
                      <p style={{ fontSize: '36px', fontWeight: 'bold', margin: '0 0 16px' }}>$25<span style={{ fontSize: '16px', fontWeight: 'normal', color: '#64748b' }}>/mo</span></p>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', color: '#475569' }}>
                        <li style={{ marginBottom: '8px' }}>✓ Unlimited Projects</li>
                        <li style={{ marginBottom: '8px' }}>✓ Team Collaboration</li>
                        <li style={{ marginBottom: '8px' }}>✓ Priority Support</li>
                      </ul>
                      <button style={{ width: '100%', backgroundColor: '#4f46e5', color: 'white', fontWeight: 600, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Choose Plan</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}