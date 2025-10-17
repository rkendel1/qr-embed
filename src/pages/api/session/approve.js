import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  // Set CORS headers for all responses from this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();
  const { token, fingerprint } = req.body;

  if (!token || !fingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  // First, let's check if the session even exists.
  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("state")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Supabase fetch error on approve:", fetchError);
    return res.status(404).json({ error: "Session not found." });
  }

  // Check if the session is in a state that can be approved.
  if (!['init', 'loaded', 'scanned'].includes(session.state)) {
    return res.status(409).json({ error: `Cannot approve session because its state is '${session.state}'.` });
  }

  const { data: updatedSession, error: updateError } = await supabase
    .from("sessions")
    .update({ state: "verified", mobile_fingerprint: fingerprint })
    .eq("token", token)
    .select()
    .single();

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
  }

  if (!updatedSession) {
    console.error("Session update failed. No rows were updated, possibly due to RLS policy.");
    return res.status(500).json({ error: "Failed to approve session. The update was not applied." });
  }

  res.status(200).json({ status: "ok" });
}