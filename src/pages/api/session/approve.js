import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();
  const { token, fingerprint } = req.body;

  if (!token || !fingerprint) {
    return res.status(400).json({ error: "Token and fingerprint are required" });
  }

  const { error } = await supabase
    .from("sessions")
    .update({ state: "verified", mobile_fingerprint: fingerprint })
    .eq("token", token);

  if (error) {
    console.error("Supabase update error:", error);
    return res.status(500).json({ error: "Failed to approve session" });
  }

  res.status(200).json({ status: "ok" });
}