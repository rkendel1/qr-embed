import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  const { token, fingerprint: mobileFingerprint } = req.body;

  if (!token || !mobileFingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("state, embed_id, resolved_success_url, fingerprint") // 'fingerprint' is the desktop one
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

  let successUrl = null;
  const { data: embed, error: embedError } = await supabase
    .from('embeds')
    .select('success_url_a, success_url_b, active_path, routing_rule')
    .eq('id', session.embed_id)
    .single();

  if (embedError || !embed) {
    console.warn(`Could not fetch embed data for embed ID ${session.embed_id}:`, embedError?.message);
  } else {
    if (embed.routing_rule === 'device_parity') {
      const desktopFingerprint = session.fingerprint;
      // Path A for different devices (success), Path B for same device (warning/alternative)
      successUrl = desktopFingerprint !== mobileFingerprint ? embed.success_url_a : embed.success_url_b;
    } else if (embed.routing_rule === 'split_test') {
      successUrl = Math.random() < 0.5 ? embed.success_url_a : embed.success_url_b;
    } else {
      // Fallback to default path logic for 'none'
      successUrl = embed.active_path === 'B' ? embed.success_url_b : embed.success_url_a;
    }
    
    if (successUrl && successUrl.trim()) {
      successUrl = successUrl.trim();
    } else {
      successUrl = null;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ 
      state: "verified", 
      mobile_fingerprint: mobileFingerprint, 
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