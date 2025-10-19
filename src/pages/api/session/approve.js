import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

const resolveSuccessUrl = async (embedId, userAgent) => {
  if (!embedId) return null;

  const { data: embed, error } = await supabase
    .from('embeds')
    .select('success_url_a, success_url_b, active_path, routing_rule')
    .eq('id', embedId)
    .single();

  if (error) {
    console.warn(`Could not fetch embed data for embed ID ${embedId}:`, error.message);
    return null;
  }
  
  if (!embed) return null;

  let chosenPath = embed.active_path;
  const isSafari = userAgent && userAgent.includes('Safari') && !userAgent.includes('Chrome');

  if (embed.routing_rule === 'safari_A') {
    chosenPath = isSafari ? 'A' : 'B';
  } else if (embed.routing_rule === 'safari_B') {
    chosenPath = isSafari ? 'B' : 'A';
  }

  const url = chosenPath === 'B' ? embed.success_url_b : embed.success_url_a;

  if (url && url.trim()) {
    return url.trim();
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
  const userAgent = req.headers['user-agent'] || '';

  if (!token || !fingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("state, embed_id, resolved_success_url")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Supabase fetch error on approve:", fetchError);
    return res.status(404).json({ error: "Session not found." });
  }

  if (session.state === 'verified') {
    return res.status(200).json({ status: "ok", successUrl: session.resolved_success_url });
  }

  if (session.state !== 'scanned') {
    return res.status(409).json({ error: `Cannot approve session because its state is '${session.state}'. It must be 'scanned'.` });
  }

  const successUrl = await resolveSuccessUrl(session.embed_id, userAgent);

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ 
      state: "verified", 
      mobile_fingerprint: fingerprint, 
      verified_at: new Date().toISOString(),
      resolved_success_url: successUrl,
    })
    .eq("token", token);

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
  }

  res.status(200).json({ status: "ok", successUrl });
}