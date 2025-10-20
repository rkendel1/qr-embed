import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const replaceLocalhostUrl = (url, appUrl) => {
  if (!url || !appUrl || process.env.NODE_ENV !== 'development') return url;
  try {
    const targetUrl = new URL(url);
    const publicUrl = new URL(appUrl);
    if (['localhost', '127.0.0.1'].includes(targetUrl.hostname)) {
      targetUrl.protocol = publicUrl.protocol;
      targetUrl.hostname = publicUrl.hostname;
      targetUrl.port = publicUrl.port;
      return targetUrl.toString();
    }
  } catch (e) {
    console.warn(`[approve] Could not parse URL for replacement: ${url}`);
  }
  return url;
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }
  const { token, fingerprint: mobileFingerprint } = req.body;

  if (!token || !mobileFingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*, embeds(id, success_url_a, success_url_b, active_path, routing_rule, jwt_secret)")
    .eq("token", token)
    .single();

  if (fetchError || !session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const embed = session.embeds;
  if (!embed) {
      return res.status(500).json({ error: "Internal server error: Missing embed configuration." });
  }

  if (session.state !== 'scanned') {
    return res.status(409).json({ error: `Cannot approve session in state: ${session.state}` });
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

  finalSuccessUrl = replaceLocalhostUrl(finalSuccessUrl, process.env.NEXT_PUBLIC_APP_URL);

  if (session.external_user_id && embed.jwt_secret) {
    const authToken = jwt.sign(
      { userId: session.external_user_id, embedId: embed.id },
      embed.jwt_secret,
      { expiresIn: '1d' } // Session is valid for 1 day
    );
    
    // Set the persistent session cookie
    const cookie = serialize('auth-token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
    });
    res.setHeader('Set-Cookie', cookie);

  } else if (session.external_user_id) {
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
    return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
  }

  res.status(200).json({ status: "ok", successUrl: finalSuccessUrl });

  const channel = supabaseAdmin.channel(`session-updates-${token}`);
  channel.send({
    type: 'broadcast',
    event: 'VERIFICATION_SUCCESS',
    payload: { state: 'verified', successUrl: finalSuccessUrl },
  });
}