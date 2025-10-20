import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Fetch the initial state of the session in case it's already verified
  const { data: initialSession, error: initialError } = await supabaseAdmin
    .from("sessions")
    .select("token, state, success_url")
    .eq("token", token)
    .single();

  if (initialError || !initialSession) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  console.log(`SSE connection established for token: ${token}`);

  // Send the current state immediately on connection
  res.write(`data: ${JSON.stringify({ state: initialSession.state, successUrl: initialSession.success_url })}\n\n`);
  res.flush();

  // If the session is already verified, we don't need to listen for updates.
  if (initialSession.state === 'verified') {
    res.end();
    return;
  }

  const heartbeatInterval = setInterval(() => {
    res.write(':heartbeat\n\n');
    res.flush();
  }, 15000);

  const channel = supabase
    .channel(`session-updates-${token}`)
    .on(
      'broadcast',
      { event: 'VERIFICATION_SUCCESS' },
      (message) => {
        console.log(`SSE: Broadcast message received for token ${token}:`, message.payload);
        res.write(`data: ${JSON.stringify(message.payload)}\n\n`);
        res.flush();
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error(`Subscription error for token ${token}:`, err);
        clearInterval(heartbeatInterval);
        res.end();
      }
    });

  req.on("close", () => {
    console.log(`Client disconnected for token ${token}. Cleaning up.`);
    clearInterval(heartbeatInterval);
    supabase.removeChannel(channel);
  });
}