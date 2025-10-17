import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  // Handle OPTIONS preflight request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Initial check to see if session exists
  const { data: initialSession, error: initialError } = await supabase
    .from("sessions")
    .select("token, state")
    .eq("token", token)
    .single();

  if (initialError || !initialSession) {
    res.status(404).end();
    return;
  }

  // Set headers for the SSE stream, including the crucial CORS header
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send the initial state immediately
  res.write(`data: ${JSON.stringify({ state: initialSession.state })}\n\n`);
  res.flush();

  const channel = supabase
    .channel(`session-updates-${token}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `token=eq.${token}`,
      },
      (payload) => {
        console.log(`Real-time update for token ${token}: state ${payload.new.state}`);
        res.write(`data: ${JSON.stringify({ state: payload.new.state })}\n\n`);
        res.flush();
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error(`Subscription error for token ${token}:`, err);
      }
    });

  req.on("close", () => {
    console.log(`Client disconnected for token ${token}. Unsubscribing.`);
    supabase.removeChannel(channel);
  });
}