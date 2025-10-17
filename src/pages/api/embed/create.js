import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

const getOrigin = (req) => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${protocol}://${host}`;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Embed name is required" });
  }

  const token = uuidv4();

  // Create the embed first to get its ID
  const { data: embed, error: embedError } = await supabase
    .from('embeds')
    .insert({ name, template_token: token })
    .select()
    .single();

  if (embedError) {
    console.error("Supabase insert error on embed create:", embedError);
    return res.status(500).json({ error: "Failed to create embed." });
  }

  // Now, create the associated session for this embed
  const origin = getOrigin(req);
  const qrUrl = `${origin}/session/${token}`;

  const { error: sessionError } = await supabase
    .from('sessions')
    .insert({
      token: token,
      state: 'init',
      embed_id: embed.id,
      qr_url: qrUrl,
    });

  if (sessionError) {
    console.error("Failed to create associated session:", sessionError);
    // Attempt to roll back the embed creation for consistency
    await supabase.from('embeds').delete().eq('id', embed.id);
    return res.status(500).json({ error: "Failed to create associated session." });
  }

  res.status(201).json(embed);
}