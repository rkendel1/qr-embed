import { supabaseAdmin } from "@/lib/supabase-admin";
import Head from 'next/head';
import Script from 'next/script';

export default function ChatbotDemoPage({ embed, origin }) {
  if (!embed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Chatbot embed configuration not found.</p>
      </div>
    );
  }

  const embedScriptSrc = `${origin}/embed.js`;

  return (
    <>
      <Head>
        <title>{`Demo: ${embed.name}`}</title>
      </Head>
      <div className="bg-gray-100 min-h-screen font-sans">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-semibold text-gray-800">Simulated Page with Chatbot</h1>
            <p className="text-xs text-gray-500 mt-1">Testing chatbot embed: <span className="font-medium">{embed.name}</span></p>
          </div>
        </header>
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Content</h2>
            <p className="text-gray-600">
              This page demonstrates the chatbot embed. A floating chat icon should appear in the bottom-right corner. Click it to start a conversation.
            </p>
            <p className="mt-4 text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed doeiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>
        </main>
        <Script
          id="qr-embed-script"
          src={embedScriptSrc}
          defer
          data-token={embed.template_token}
          data-host={origin}
        />
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
    .select("name, template_token")
    .eq("template_token", embedToken)
    .eq("component_type", "chatbot")
    .single();

  if (error || !embed) {
    console.error("Error fetching chatbot embed for demo page:", error);
    return { notFound: true };
  }

  const host = context.req.headers.host || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const defaultOrigin = `${protocol}://${host}`;

  const origin = process.env.NEXT_PUBLIC_APP_URL || defaultOrigin;

  return {
    props: {
      embed,
      origin,
    },
  };
}