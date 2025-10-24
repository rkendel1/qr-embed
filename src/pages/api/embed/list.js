import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { data, error } = await supabase
    .from("embeds")
    .select("*, roles(id, name), apps(id, name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error listing embeds:", error);
    return res.status(500).json({ error: "Failed to fetch embeds." });
  }

  res.status(200).json(data);
}