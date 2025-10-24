import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "App name is required" });
  }

  const { data, error } = await supabaseAdmin
    .from('apps')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error on app create:", error);
    return res.status(500).json({ error: `Database error: ${error.message}` });
  }

  res.status(201).json(data);
}