import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Embed name is required" });
  }

  const token = uuidv4();

  const { data: embed, error: embedError } = await supabase
    .from('embeds')
    .insert({ 
      name, 
      template_token: token, 
      is_active: true,
      success_url_a: '',
      success_url_b: '',
      active_path: 'A',
      routing_rule: 'none',
    })
    .select()
    .single();

  if (embedError) {
    console.error("Supabase insert error on embed create:", embedError);
    return res.status(500).json({ error: "Failed to create embed." });
  }

  res.status(201).json(embed);
}