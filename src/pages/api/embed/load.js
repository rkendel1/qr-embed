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

  const { token, fingerprint } = req.body;

  if (!token || !fingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  // Find the session and update it from 'pending' to 'init'
  const { data: session, error: updateError } = await supabase
    .from("sessions")
    .update({
      fingerprint: fingerprint,
      state: "init",
    })
    .eq("token", token)
    .eq("state", "pending") // Only update if it's in the correct initial state
    .select("qr_url")
    .single();

  if (updateError || !session) {
    console.error("Supabase update error on load:", updateError);
    return res.status(404).json({ error: "Session not found or already initialized." });
  }

  const qrDataUrl = await QRCode.toDataURL(session.qr_url);

  res.status(200).json({ qrDataUrl });
}