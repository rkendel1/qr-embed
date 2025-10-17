import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*, embeds(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase select error:", error);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }

  res.status(200).json(sessions);
}