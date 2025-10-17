import { supabase } from "@/lib/supabase";
import Head from 'next/head';
import Script from 'next/script';

export default function ConsumerPage({ embed, origin }) {
  if (!embed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Embed not found.</p>
      </div>
    );
  }

  const embedScriptSrc = `${origin}/embed.js`;

  return (
    <>
      <Head>
        <title>Consumer Load Page</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">QR Code Loader</h1>
          <p className="text-gray-600 mb-6">
            This page loads the embed and generates the session.
          </p>
          <div className="flex justify-center items-center bg-gray-50 p-8 rounded-lg min-h-[200px] w-[250px]">
            {/* The embed script will create and insert the QR code here */}
            <Script
              id="qr-embed-script"
              src={embedScriptSrc}
              defer
              data-token={embed.template_token}
              data-host={origin}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const { embedToken } = context.params;
  const { req } = context;

  if (!embedToken) {
    return { notFound: true };
  }

  const { data: embed, error } = await supabase
    .from("embeds")
    .select("id, name, template_token")
    .eq("template_token", embedToken)
    .single();

  if (error || !embed) {
    console.error("Error fetching embed for consumer page:", error);
    return { notFound: true };
  }

  const getOrigin = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  };
  const origin = getOrigin();

  return {
    props: {
      embed,
      origin,
    },
  };
}