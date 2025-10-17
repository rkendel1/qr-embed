import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") return res.status(405).end();
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Only update if it's in the 'init' state to prevent race conditions
  const { error } = await supabase
    .from("sessions")
    .update({ state: "loaded" })
    .eq("token", token)
    .eq("state", "init");

  if (error) {
    console.error("Supabase update error on loaded:", error);
    return res.status(500).json({ error: "Failed to update session state." });
  }

  res.status(200).json({ status: "ok" });
}