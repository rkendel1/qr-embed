
import Head from 'next/head';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Welcome to sibin</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          Welcome to sibin
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
          This is your brand new application, ready to go.
        </p>
      </div>
    </>
  );
}
    