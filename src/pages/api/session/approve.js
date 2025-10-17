import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const { error } = await supabase
    .from("sessions")
    .update({ state: "verified" })
    .eq("token", token);

  if (error) {
    console.error("Supabase update error:", error);
    return res.status(500).json({ error: "Failed to approve session" });
  }

  res.status(200).json({ status: "ok" });
}