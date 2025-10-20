import { supabaseAdmin } from "@/lib/supabase-admin";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  console.log('API /embed/load route hit with method:', req.method);

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

  const { templateToken, fingerprint, userId, origin: clientOrigin } = req.body;

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
  
  // Prefer the origin sent from the client script, as it's more reliable
  // than server headers which can be ambiguous in some environments.
  const origin = clientOrigin || (() => {
    const host = req.headers.host;
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${protocol}://${host}`;
  })();

  if (!origin) {
    const errorMessage = "Server configuration error: Could not determine origin URL.";
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
      external_user_id: userId, // Store the user ID
    })
    .select()
    .single();

  if (insertError || !newSession) {
    console.error("Supabase insert error on load:", insertError);
    res.status(500).json({ error: "Failed to create session." });
    return;
  }

  const { default: QRCode } = await import("qrcode");
  const qrDataUrl = await QRCode.toDataURL(qrUrl);
  res.status(200).json({ qrDataUrl, sessionToken: newSession.token });
}