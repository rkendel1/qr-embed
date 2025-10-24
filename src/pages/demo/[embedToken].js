import { supabaseAdmin } from "@/lib/supabase-admin";
import Head from 'next/head';
import Script from 'next/script';

export default function DemoPage({ embed, origin, loggedInUser }) {
  if (!embed || !loggedInUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Embed or user data not found. Server may be misconfigured.</p>
      </div>
    );
  }

  const embedScriptSrc = `${origin}/embed.js`;
  const targetId = `qr-embed-container-${embed.template_token}`;

  return (
    <>
      <Head>
        <title>{`Demo: ${embed.name}`}</title>
      </Head>
      <div className="bg-gray-100 min-h-screen">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-800">Simulated Product Page</h1>
              <p className="text-xs text-gray-500 mt-1">Testing embed: <span className="font-medium">{embed.name}</span></p>
            </div>
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-medium text-gray-900">{loggedInUser.name} ({loggedInUser.role})</span>
            </div>
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
                  We are passing the User ID <code className="bg-gray-200 text-sm p-1 rounded">{loggedInUser.id}</code> and Role <code className="bg-gray-200 text-sm p-1 rounded">{loggedInUser.role}</code> to the script.
                </p>
                <div 
                  id={targetId}
                  className="flex justify-center items-center min-h-[200px]"
                >
                  {/* The embed script will target this div */}
                </div>
                <Script
                  id="qr-embed-script"
                  src={embedScriptSrc}
                  defer
                  data-token={embed.template_token}
                  data-host={origin}
                  data-user-id={loggedInUser.id}
                  data-user-name={loggedInUser.name}
                  data-user-email={loggedInUser.email}
                  data-user-role={loggedInUser.role}
                  data-target-id={targetId}
                />
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

  const { data: embed, error } = await supabaseAdmin
    .from("embeds")
    .select("id, name, template_token, roles(name)")
    .eq("template_token", embedToken)
    .single();

  if (error || !embed) {
    console.error("Error fetching embed for demo page:", error);
    return { notFound: true };
  }

  const host = context.req.headers.host || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const defaultOrigin = `${protocol}://${host}`;

  const origin = process.env.NEXT_PUBLIC_APP_URL || defaultOrigin;

  // Generate dynamic user data for the demo to simulate a real user session
  const randomId = Math.floor(1000 + Math.random() * 9000);
  
  // Determine role based on embed config. Default to 'user'.
  const role = embed.roles?.name || 'user';

  const loggedInUser = {
    id: `user-${randomId}-demo`,
    name: `Demo User ${randomId}`,
    email: `demo.user.${randomId}@example.com`,
    role: role,
  };

  return {
    props: {
      embed,
      origin,
      loggedInUser,
    },
  };
}