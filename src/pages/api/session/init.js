import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { fingerprint, context = "marketing" } = req.body;
  const token = uuidv4();
  const qrUrl = `${req.headers.origin}/session/${token}`;

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

  // Generate QR (base64)
  const qrDataUrl = await QRCode.toDataURL(qrUrl);

  res.status(200).json({ token, qrUrl, qrDataUrl });
}