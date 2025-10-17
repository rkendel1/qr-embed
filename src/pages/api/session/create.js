import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { context } = req.body;

  if (!context) {
    return res.status(400).json({ error: "Context is required" });
  }

  const token = uuidv4();
  const getOrigin = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
  };
  const origin = getOrigin();
  const qrUrl = `${origin}/session/${token}`;

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      token,
      state: "pending", // A new state for generated but not-yet-loaded sessions
      context: context,
      qr_url: qrUrl,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Failed to create session" });
  }

  res.status(201).json(data);
}