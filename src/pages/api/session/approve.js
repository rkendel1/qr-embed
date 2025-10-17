import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    const errorMessage = "Server configuration error: SUPABASE_SERVICE_KEY is not set. Cannot perform admin actions.";
    console.error(errorMessage);
    return res.status(500).json({ error: errorMessage });
  }

  if (req.method !== "POST") return res.status(405).end();
  const { token, fingerprint } = req.body;

  if (!token || !fingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  // First, let's check if the session even exists using the public client.
  const { data: sessions, error: fetchError } = await supabase
    .from("sessions")
    .select("state")
    .eq("token", token);

  if (fetchError || !sessions || sessions.length === 0) {
    console.error("Supabase fetch error on approve:", fetchError);
    return res.status(404).json({ error: "Session not found." });
  }

  const session = sessions[0]; // Take the first one

  // Check if the session is in a state that can be approved.
  if (!['init', 'loaded', 'scanned'].includes(session.state)) {
    return res.status(409).json({ error: `Cannot approve session because its state is '${session.state}'.` });
  }

  // Use the admin client to perform the update.
  const { data: updatedSessions, error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ state: "verified", mobile_fingerprint: fingerprint, verified_at: new Date().toISOString() })
    .eq("token", token)
    .select();

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
  }

  if (!updatedSessions || updatedSessions.length === 0) {
    console.error("Session update failed. No rows were updated, possibly due to RLS policy.");
    return res.status(500).json({ error: "Failed to approve session. The update was not applied." });
  }

  res.status(200).json({ status: "ok" });
}