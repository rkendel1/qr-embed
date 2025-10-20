import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { v4 as uuidv4 } from "uuid";

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
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { templateToken, fingerprint } = req.body;

  if (!templateToken || !fingerprint) {
    res.status(400).json({ error: "Embed token and fingerprint are required" });
    return;
  }

  // 1. Verify the embed exists and is active using the admin client
  const { data: embed, error: embedError } = await supabaseAdmin
    .from('embeds')
    .select('id, is_active')
    .eq('template_token', templateToken)
    .single();

  if (embedError || !embed) {
    console.error("Embed lookup failed:", embedError);
    res.status(404).json({ error: "Embed configuration not found." });
    return;
  }

  if (!embed.is_active) {
    res.status(403).json({ error: "This embed is currently inactive." });
    return;
  }

  // 2. Always create a new session using the admin client to ensure consistency.
  const sessionToken = uuidv4();
  const origin = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin) {
    const errorMessage = "Server configuration error: NEXT_PUBLIC_APP_URL is not set. This is required for QR code generation.";
    console.error(errorMessage);
    res.status(500).json({ error: errorMessage });
    return;
  }
  
  const qrUrl = `${origin}/session/${sessionToken}`;

  const { data: newSession, error: insertError } = await supabaseAdmin
    .from("sessions")
    .insert({
      token: sessionToken,
      state: "loaded",
      embed_id: embed.id,
      fingerprint: fingerprint,
      qr_url: qrUrl,
      loaded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !newSession) {
    console.error("Supabase insert error on load:", insertError);
    res.status(500).json({ error: "Failed to create session." });
    return;
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl);
  res.status(200).json({ qrDataUrl, sessionToken: newSession.token });
}