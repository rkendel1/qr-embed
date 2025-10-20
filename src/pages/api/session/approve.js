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

  if (!token || !mobileFingerprint) {
    res.status(400).json({ error: "Token and fingerprint are required" });
    return;
  }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("state, embed_id, fingerprint, external_user_id")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  if (session.state !== 'scanned') {
    res.status(409).json({ error: `Cannot approve session in state: ${session.state}` });
    return;
  }

  const { data: embed, error: embedError } = await supabaseAdmin
    .from("embeds")
    .select("success_url_a, success_url_b, active_path, routing_rule")
    .eq("id", session.embed_id)
    .single();

  let finalSuccessUrl = null;
  if (embed) {
    let baseUrl = embed.active_path === 'B' ? embed.success_url_b : embed.success_url_a;
    if (embed.routing_rule === 'device_parity') {
      baseUrl = session.fingerprint !== mobileFingerprint ? embed.success_url_a : embed.success_url_b;
    } else if (embed.routing_rule === 'split_test') {
      baseUrl = Math.random() < 0.5 ? embed.success_url_a : embed.success_url_b;
    }
    
    if (baseUrl && baseUrl.trim()) {
      finalSuccessUrl = baseUrl.trim();
    }
  }

  // Generate JWT if an external_user_id exists
  if (session.external_user_id && finalSuccessUrl) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("CRITICAL: JWT_SECRET environment variable is not set.");
      res.status(500).json({ error: "Server configuration error." });
      return;
    }
    const authToken = jwt.sign(
      { userId: session.external_user_id },
      jwtSecret,
      { expiresIn: '5m' } // Token is valid for 5 minutes
    );
    
    const url = new URL(finalSuccessUrl);
    url.searchParams.set('token', authToken);
    finalSuccessUrl = url.toString();
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