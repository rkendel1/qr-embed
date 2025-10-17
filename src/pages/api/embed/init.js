import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Allow requests from any origin for the embed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { fingerprint, context } = req.body;

  if (!fingerprint || !context) {
    return res.status(400).json({ error: "Fingerprint and context are required" });
  }

  const token = uuidv4();
  // Use the public app URL from env if available, otherwise construct from headers
  const getOrigin = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  };
  const origin = getOrigin();
  const qrUrl = `${origin}/session/${token}`;

  const { error } = await supabase.from("sessions").insert({
    token,
    fingerprint,
    state: "init",
    context: context,
    qr_url: qrUrl,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Failed to initialize session" });
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl);

  res.status(200).json({ token, qrDataUrl });
}