import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.query;

  // Initial check to see if session exists
  const { data: initialSession, error: initialError } = await supabase
    .from("sessions")
    .select("token")
    .eq("token", token)
    .single();

  if (initialError || !initialSession) {
    res.status(404).end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const interval = setInterval(async () => {
    const { data: currentSession, error } = await supabase
      .from("sessions")
      .select("state")
      .eq("token", token)
      .single();
    
    if (error) {
      console.error(`Polling error for token ${token}:`, error);
      return;
    }

    console.log(`Poll for token ${token}: state ${currentSession ? currentSession.state : 'no session'}`);
    res.write(`data: ${JSON.stringify({ state: currentSession ? currentSession.state : 'unknown' })}\n\n`);
    res.flush();
  }, 1000);

  req.on("close", () => clearInterval(interval));
}