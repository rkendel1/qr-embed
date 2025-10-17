import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

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

  // 1. Find the session using the token from the embed.
  // The templateToken IS the sessionToken in this new logic.
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('qr_url, state, embed_fingerprint')
    .eq('token', templateToken)
    .single();

  if (sessionError || !session) {
    console.error("Session lookup failed:", sessionError);
    return res.status(404).json({ error: "Session for this embed not found." });
  }

  // 2. Update the session with the browser fingerprint if it hasn't been set yet.
  // This makes the load operation idempotent for the same browser.
  if (!session.embed_fingerprint) {
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ embed_fingerprint: fingerprint })
      .eq('token', templateToken);

    if (updateError) {
      console.error("Failed to update session with fingerprint:", updateError);
      return res.status(500).json({ error: "Failed to initialize session." });
    }
  }

  // 3. Generate the QR code from the stored URL and return it.
  const qrDataUrl = await QRCode.toDataURL(session.qr_url);
  res.status(200).json({ qrDataUrl, sessionToken: templateToken });
}