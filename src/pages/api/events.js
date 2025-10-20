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

  const { data: initialSession, error: initialError } = await supabaseAdmin
    .from("sessions")
    .select("token, state")
    .eq("token", token)
    .single();

  if (initialError || !initialSession) {
    res.status(404).end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  console.log(`SSE connection established for token: ${token}`);

  res.write(`data: ${JSON.stringify({ state: initialSession.state })}\n\n`);
  res.flush();

  const heartbeatInterval = setInterval(() => {
    res.write(':heartbeat\n\n');
    res.flush();
  }, 15000);

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
        
        const eventData = { state: payload.new.state };
        
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
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