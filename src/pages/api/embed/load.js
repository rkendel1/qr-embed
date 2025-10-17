import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import jwt from 'jsonwebtoken';

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

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  let context;
  try {
    const decoded = jwt.verify(templateToken, jwtSecret);
    context = decoded.context;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).json({ error: "Invalid or expired token." });
  }

  // A valid template token, now create a unique session for this visitor
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
      context: context,
      fingerprint: fingerprint,
      qr_url: qrUrl,
    });

  if (error) {
    console.error("Supabase insert error on load:", error);
    return res.status(500).json({ error: "Failed to create session." });
  }

  const qrDataUrl = await QRCode.toDataURL(qrUrl);

  // Return the NEW session token to the client
  res.status(200).json({ qrDataUrl, sessionToken });
}