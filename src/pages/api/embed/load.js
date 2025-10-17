import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { templateToken, fingerprint } = req.body;

  if (!templateToken || !fingerprint) {
    return res.status(400).json({ error: "Template token and fingerprint are required" });
  }

  // 1. Verify the embed exists
  const { data: embed, error: embedError } = await supabase
    .from('embeds')
    .select('id')
    .eq('template_token', templateToken)
    .single();

  if (embedError || !embed) {
    console.error("Embed lookup failed:", embedError);
    return res.status(404).json({ error: "Embed configuration not found." });
  }

  // 2. Look for an existing, unverified session for this device
  const { data: existingSessions, error: existingSessionError } = await supabase
    .from('sessions')
    .select('token, qr_url')
    .eq('embed_id', embed.id)
    .eq('embed_fingerprint', fingerprint)
    .in('state', ['init', 'scanned'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (existingSessionError) {
    console.error("Error fetching existing session:", existingSessionError);
    return res.status(500).json({ error: "Database error checking for session." });
  }

  if (existingSessions && existingSessions.length > 0) {
    const existingSession = existingSessions[0];
    // An active session already exists, so we'll reuse it.
    const qrDataUrl = await QRCode.toDataURL(existingSession.qr_url);
    return res.status(200).json({ qrDataUrl, sessionToken: existingSession.token });
  }

  // 3. No active session found, so create a new one.
  const sessionToken = uuidv4();
  const getOrigin = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  };
  const origin = getOrigin();
  const qrUrl = `${origin}/session/${sessionToken}`;

  const { data: newSession, error: insertError } = await supabase
    .from("sessions")
    .insert({
      token: sessionToken,
      state: "init",
      embed_id: embed.id,
      embed_fingerprint: fingerprint,
      qr_url: qrUrl,
    })
    .select()
    .single();

  if (insertError || !newSession) {
    console.error("Supabase insert error on load:", insertError);
    return res.status(500).json({ error: "Failed to create session." });
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl);
  res.status(200).json({ qrDataUrl, sessionToken: newSession.token });
}