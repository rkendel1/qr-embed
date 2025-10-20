import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";

// Helper function to fetch session with retries to handle potential replication lag
async function findSessionWithRetry(token, retries = 3, delay = 250) {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select("token, state, success_url")
      .eq("token", token)
      .single();
    
    if (!error && data) {
      return { initialSession: data, initialError: null };
    }
    
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  console.error(`Could not find session for token ${token} after ${retries} retries.`);
  return { initialSession: null, initialError: "Session not found after retries" };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const { initialSession, initialError } = await findSessionWithRetry(token);

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

  res.write(`data: ${JSON.stringify({ state: initialSession.state, successUrl: initialSession.success_url })}\n\n`);
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
      async (payload) => {
        console.log(`Real-time update received for token ${token}. Refetching data.`);
        
        const { data: updatedSession, error } = await supabaseAdmin
          .from('sessions')
          .select('state, success_url')
          .eq('token', token)
          .single();

        if (error || !updatedSession) {
          console.error(`SSE: Failed to refetch session ${token} after update notification.`, error);
          return;
        }

        const eventData = { 
          state: updatedSession.state,
          successUrl: updatedSession.success_url 
        };
        
        console.log(`SSE: Sending event for token ${token}:`, eventData);
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