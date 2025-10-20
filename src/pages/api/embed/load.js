import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { templateToken, fingerprint } = req.body;

  if (!templateToken || !fingerprint) {
    return res.status(400).json({ error: "Embed token and fingerprint are required" });
  }

  // 1. Verify the embed exists and is active using the admin client
  const { data: embed, error: embedError } = await supabaseAdmin
    .from('embeds')
    .select('id, is_active')
    .eq('template_token', templateToken)
    .single();

  if (embedError || !embed) {
    console.error("Embed lookup failed:", embedError);
    return res.status(404).json({ error: "Embed configuration not found." });
  }

  if (!embed.is_active) {
    return res.status(403).json({ error: "This embed is currently inactive." });
  }

  // 2. Always create a new session using the admin client to ensure consistency.
  const sessionToken = uuidv4();
  const origin = process.env.NEXT_PUBLIC_APP_URL;

  if (!origin) {
    const errorMessage = "Server configuration error: NEXT_PUBLIC_APP_URL is not set. This is required for QR code generation.";
    console.error(errorMessage);
    return res.status(500).json({ error: errorMessage });
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
    return res.status(500).json({ error: "Failed to create session." });
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl);
  res.status(200).json({ qrDataUrl, sessionToken: newSession.token });
}