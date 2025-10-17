import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Embed name is required" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  // Insert into the new embeds table first
  const { data: embedData, error: insertError } = await supabase
    .from('embeds')
    .insert({ name, template_token: 'temp' }) // temp token first
    .select()
    .single();

  if (insertError) {
    console.error("Supabase insert error on embed create:", insertError);
    return res.status(500).json({ error: "Failed to create embed." });
  }

  // Now create a token that contains the ID of the new embed
  const templateToken = jwt.sign({ embedId: embedData.id }, jwtSecret);

  // Update the row with the final token
  const { data: updatedData, error: updateError } = await supabase
    .from('embeds')
    .update({ template_token: templateToken })
    .eq('id', embedData.id)
    .select()
    .single();
  
  if (updateError) {
    console.error("Supabase update error on embed create:", updateError);
    // Here you might want to delete the previously inserted row for cleanup
    return res.status(500).json({ error: "Failed to finalize embed." });
  }

  res.status(201).json(updatedData);
}