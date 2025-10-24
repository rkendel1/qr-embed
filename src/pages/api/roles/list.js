import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { data, error } = await supabaseAdmin
    .from("roles")
    .select(`
      *,
      users (
        id,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error listing roles:", error);
    return res.status(500).json({ error: "Failed to fetch roles." });
  }

  res.status(200).json(data);
}