import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name, description, permissions } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Role name is required" });
  }

  const { data, error } = await supabaseAdmin
    .from('roles')
    .insert({ name, description, permissions: permissions || [] })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error on role create:", error);
    if (error.code === '23505') { // unique constraint violation
        return res.status(409).json({ error: `A role with the name "${name}" already exists.` });
    }
    return res.status(500).json({ error: `Database error: ${error.message}` });
  }

  res.status(201).json(data);
}