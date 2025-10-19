import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

const getSuccessUrlForEmbed = async (embedId) => {
  if (!embedId) return null;

  const { data: embedData, error: embedError } = await supabase
    .from('embeds')
    .select('success_url_a, success_url_b, active_path')
    .eq('id', embedId)
    .single();

  if (embedError) {
    console.warn(`Could not fetch embed data for embed ID ${embedId}:`, embedError.message);
    return null;
  }
  
  if (embedData) {
    const url = embedData.active_path === 'B' ? embedData.success_url_b : embedData.success_url_a;
    if (url && url.trim()) {
      return url.trim();
    }
  }

  return null;
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const errorMessage = "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Cannot perform admin actions.";
    console.error(errorMessage);
    return res.status(500).json({ error: errorMessage });
  }

  if (req.method !== "POST") return res.status(405).end();
  const { token, fingerprint } = req.body;

  if (!token || !fingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("state, embed_id")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Supabase fetch error on approve:", fetchError);
    return res.status(404).json({ error: "Session not found." });
  }

  // If already verified, it's a success. Just return the redirect URL.
  if (session.state === 'verified') {
    const successUrl = await getSuccessUrlForEmbed(session.embed_id);
    return res.status(200).json({ status: "ok", successUrl });
  }

  // If it's not in a state that can be approved, it's an error.
  if (session.state !== 'scanned') {
    return res.status(409).json({ error: `Cannot approve session because its state is '${session.state}'. It must be 'scanned'.` });
  }

  const { data: updatedSession, error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ state: "verified", mobile_fingerprint: fingerprint, verified_at: new Date().toISOString() })
    .eq("token", token)
    .select('embed_id')
    .single();

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
  }

  if (!updatedSession) {
    console.error("Session update failed. No rows were updated, possibly due to RLS policy.");
    return res.status(500).json({ error: "Failed to approve session. The update was not applied." });
  }

  const successUrl = await getSuccessUrlForEmbed(updatedSession.embed_id);
  res.status(200).json({ status: "ok", successUrl });
}