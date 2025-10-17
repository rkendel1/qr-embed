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

  // Verify the embed exists by looking up the template token
  const { data: embed, error: embedError } = await supabase
    .from('embeds')
    .select('id')
    .eq('template_token', templateToken)
    .single();

  if (embedError || !embed) {
    console.error("Embed lookup failed:", embedError);
    return res.status(404).json({ error: "Embed configuration not found." });
  }

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

  const { error } = await supabase
    .from("sessions")
    .insert({
      token: sessionToken,
      state: "init",
      embed_id: embed.id, // Use the foreign key
      embed_fingerprint: fingerprint,
      qr_url: qrUrl,
    });

  if (error) {
    console.error("Supabase insert error on load:", error);
    return res.status(500).json({ error: "Failed to create session." });
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl);

  res.status(200).json({ qrDataUrl, sessionToken });
}