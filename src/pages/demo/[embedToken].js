import { supabase } from "@/lib/supabase";
import Head from 'next/head';
import Script from 'next/script';

export default function DemoPage({ embed, origin }) {
  if (!embed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Embed not found or server is misconfigured.</p>
      </div>
    );
  }

  const embedScriptSrc = `${origin}/embed.js`;

  return (
    <>
      <Head>
        <title>{`Demo: ${embed.name}`}</title>
      </Head>
      <div className="bg-gray-100 min-h-screen">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-semibold text-gray-800">Simulated Product Page</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Our Amazing Product</h2>
              <p className="text-lg text-indigo-600 font-semibold mb-4">$99.99</p>
              <p className="text-gray-600 mb-6">
                This is a demonstration of how the QR code embed appears on a typical product page. 
                The component below is loaded dynamically and is ready to connect a user&apos;s session.
              </p>
              
              <div className="mt-8 p-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Connect Your Device</h3>
                <p className="text-gray-600 mb-4">
                  Scan the QR code below with your mobile device to securely connect and continue.
                </p>
                <div className="flex justify-center items-center bg-gray-50 p-8 rounded-lg min-h-[200px]">
                  {/* The embed script will now create and insert the QR code here */}
                  <Script
                    id="qr-embed-script"
                    src={embedScriptSrc}
                    defer
                    data-token={embed.template_token}
                    data-host={origin}
                    data-user-id="user-123-demoflow"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const { embedToken } = context.params;

  if (!embedToken) {
    return { notFound: true };
  }

  const { data: embed, error } = await supabase
    .from("embeds")
    .select("id, name, template_token")
    .eq("template_token", embedToken)
    .single();

  if (error || !embed) {
    console.error("Error fetching embed for demo page:", error);
    return { notFound: true };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) {
    console.error("Demo page requires NEXT_PUBLIC_APP_URL to be set.");
    return { props: { embed: null, origin: null } };
  }

  return {
    props: {
      embed,
      origin,
    },
  };
}