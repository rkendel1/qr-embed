import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function handler(req, res) {
  // Explicitly handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const { token, fingerprint: mobileFingerprint } = req.body;

  if (!token || !mobileFingerprint) {
    res.status(400).json({ error: "Token and fingerprint are required" });
    return;
  }

  // Step 1: Fetch the session by token
  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("state, embed_id, fingerprint")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Supabase fetch error on approve:", fetchError);
    res.status(404).json({ error: "Session not found." });
    return;
  }

  if (session.state === 'verified') {
    res.status(200).json({ status: "ok", successUrl: null });
    return;
  }

  if (session.state !== 'scanned') {
    res.status(409).json({ error: `Cannot approve session because its state is '${session.state}'. It must be 'scanned'.` });
    return;
  }

  // Step 2: Fetch the associated embed configuration
  const { data: embed, error: embedError } = await supabaseAdmin
    .from("embeds")
    .select("success_url_a, success_url_b, active_path, routing_rule")
    .eq("id", session.embed_id)
    .single();

  if (embedError || !embed) {
    console.warn(`Could not find embed data (id: ${session.embed_id}) for session ${token}`);
  }

  // Step 3: Determine the correct success URL
  let successUrl = null;
  if (embed) {
    if (embed.routing_rule === 'device_parity') {
      const desktopFingerprint = session.fingerprint;
      successUrl = desktopFingerprint !== mobileFingerprint ? embed.success_url_a : embed.success_url_b;
    } else if (embed.routing_rule === 'split_test') {
      successUrl = Math.random() < 0.5 ? embed.success_url_a : embed.success_url_b;
    } else { // 'none' or default
      successUrl = embed.active_path === 'B' ? embed.success_url_b : embed.active_path === 'A' ? embed.success_url_a : null;
    }
    
    if (successUrl && successUrl.trim()) {
      successUrl = successUrl.trim();
    } else {
      successUrl = null;
    }
  }

  // Step 4: Update the session to 'verified'
  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ 
      state: "verified", 
      mobile_fingerprint: mobileFingerprint, 
      verified_at: new Date().toISOString(),
      success_url: successUrl,
    })
    .eq("token", token);

  if (updateError) {
    console.error("Supabase update error:", updateError);
    res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
    return;
  }

  // Step 5: Respond to the mobile client immediately.
  res.status(200).json({ status: "ok", successUrl });

  // Step 6: Broadcast the success message in the background (fire and forget).
  // This prevents the mobile client from timing out while waiting for the broadcast.
  const channel = supabaseAdmin.channel(`session-updates-${token}`);
  channel.send({
    type: 'broadcast',
    event: 'VERIFICATION_SUCCESS',
    payload: { state: 'verified', successUrl },
  }).then(() => {
    supabaseAdmin.removeChannel(channel);
  });
}