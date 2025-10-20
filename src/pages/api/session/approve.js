import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { token, fingerprint: mobileFingerprint } = req.body;

  if (!token || !mobileFingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  // Step 1: Fetch the session by token
  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("state, embed_id, resolved_success_url, fingerprint")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error("Supabase fetch error on approve:", fetchError);
    return res.status(404).json({ error: "Session not found." });
  }

  // Handle cases where the session is already verified
  if (session.state === 'verified') {
    return res.status(200).json({ status: "ok", successUrl: session.resolved_success_url });
  }

  // Ensure the session is in the correct state to be approved
  if (session.state !== 'scanned') {
    return res.status(409).json({ error: `Cannot approve session because its state is '${session.state}'. It must be 'scanned'.` });
  }

  // Step 2: Fetch the associated embed configuration
  const { data: embed, error: embedError } = await supabaseAdmin
    .from("embeds")
    .select("success_url_a, success_url_b, active_path, routing_rule")
    .eq("id", session.embed_id)
    .single();

  if (embedError || !embed) {
    console.warn(`Could not find embed data (id: ${session.embed_id}) for session ${token}`);
    // This is a server configuration issue, proceed without a success URL.
    // The session will be verified, but no redirect will occur.
  }

  // Step 3: Determine the correct success URL based on routing rules
  let successUrl = null;
  if (embed) {
    if (embed.routing_rule === 'device_parity') {
      const desktopFingerprint = session.fingerprint;
      successUrl = desktopFingerprint !== mobileFingerprint ? embed.success_url_a : embed.success_url_b;
    } else if (embed.routing_rule === 'split_test') {
      successUrl = Math.random() < 0.5 ? embed.success_url_a : embed.success_url_b;
    } else { // 'none' or default
      successUrl = embed.active_path === 'B' ? embed.success_url_b : embed.success_url_a;
    }
    
    // Ensure URL is not an empty string
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
      resolved_success_url: successUrl,
    })
    .eq("token", token);

  if (updateError) {
    console.error("Supabase update error:", updateError);
    return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
  }

  res.status(200).json({ status: "ok", successUrl });
}