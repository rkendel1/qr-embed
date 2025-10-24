import { createClient } from "@supabase/supabase-js";

// Use the Edge runtime for this route to support long-lived connections
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // In the Edge runtime, we get a Request object instead of Node's req.
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: "Token is required" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create dedicated clients for this Edge function to avoid build issues
  // with shared modules between Node.js and Edge runtimes.
  const supabaseAdminEdge = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const supabaseEdge = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch the initial state of the session
  const { data: initialSession, error: initialError } = await supabaseAdminEdge
    .from("sessions")
    .select("token, state, success_url")
    .eq("token", token)
    .single();

  if (initialError || !initialSession) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a stream to send events to the client
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (data) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Send the current state immediately on connection
  sendEvent({ state: initialSession.state, successUrl: initialSession.success_url });

  // Only listen for updates if the session isn't already completed
  if (initialSession.state !== 'verified') {
    const channel = supabaseEdge
      .channel(`session-updates-${token}`)
      .on(
        'broadcast',
        { event: 'STATE_CHANGE' },
        (message) => {
          console.log(`SSE: Broadcast message received for token ${token}:`, message.payload);
          sendEvent(message.payload);
          // Cleanly close the connection only after final success
          if (message.payload.state === 'verified') {
            writer.close();
            supabaseEdge.removeChannel(channel);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error(`Subscription error for token ${token}:`, err);
          writer.close();
          supabaseEdge.removeChannel(channel);
        }
      });

    // The request object in the Edge runtime has a signal that aborts when the client disconnects.
    // We use this to clean up the Supabase channel subscription.
    req.signal.addEventListener('abort', () => {
      console.log(`Client disconnected for token ${token}. Cleaning up.`);
      supabaseEdge.removeChannel(channel);
      writer.close();
    });
  } else {
    // Close immediately if already verified
    writer.close();
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      // Vercel specific header to prevent buffering and allow streaming
      'X-Accel-Buffering': 'no',
    },
  });
}