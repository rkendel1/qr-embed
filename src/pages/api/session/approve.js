import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
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

  console.log(`[approve] Received request for token: ${token}`);

  if (!token || !mobileFingerprint) {
    res.status(400).json({ error: "Token and fingerprint are required" });
    return;
  }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*, embeds(id, success_url_a, success_url_b, active_path, routing_rule, jwt_secret)")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    console.error(`[approve] Session lookup failed for token ${token}:`, fetchError);
    res.status(404).json({ error: "Session not found." });
    return;
  }

  const embed = session.embeds;
  if (!embed) {
      console.error(`[approve] Could not find embed data for session ${token}.`);
      res.status(500).json({ error: "Internal server error: Missing embed configuration." });
      return;
  }

  if (session.state !== 'scanned') {
    res.status(409).json({ error: `Cannot approve session in state: ${session.state}` });
    return;
  }

  let finalSuccessUrl = null;
  let baseUrl = embed.active_path === 'B' ? embed.success_url_b : embed.success_url_a;
  if (embed.routing_rule === 'device_parity') {
    baseUrl = session.fingerprint !== mobileFingerprint ? embed.success_url_a : embed.success_url_b;
  } else if (embed.routing_rule === 'split_test') {
    baseUrl = Math.random() < 0.5 ? embed.success_url_a : embed.success_url_b;
  }
  
  if (baseUrl && baseUrl.trim()) {
    finalSuccessUrl = baseUrl.trim();
  }

  // Generate JWT if an external_user_id exists and a secret is configured
  if (session.external_user_id && finalSuccessUrl && embed.jwt_secret) {
    const authToken = jwt.sign(
      { 
        userId: session.external_user_id,
        embedId: embed.id,
      },
      embed.jwt_secret,
      { expiresIn: '5m' } // Token is valid for 5 minutes
    );
    
    const url = new URL(finalSuccessUrl);
    url.searchParams.set('token', authToken);
    finalSuccessUrl = url.toString();
  } else if (session.external_user_id && finalSuccessUrl) {
    console.warn(`[approve] JWT SSO was requested for embed ${embed.id} but no JWT Secret is configured.`);
  }

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ 
      state: "verified", 
      mobile_fingerprint: mobileFingerprint, 
      verified_at: new Date().toISOString(),
      success_url: finalSuccessUrl,
    })
    .eq("token", token);

  if (updateError) {
    console.error(`[approve] Session update failed for token ${token}:`, updateError);
    res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
    return;
  }

  res.status(200).json({ status: "ok", successUrl: finalSuccessUrl });

  const channel = supabaseAdmin.channel(`session-updates-${token}`);
  channel.send({
    type: 'broadcast',
    event: 'VERIFICATION_SUCCESS',
    payload: { state: 'verified', successUrl: finalSuccessUrl },
  });
}