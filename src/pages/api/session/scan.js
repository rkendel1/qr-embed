import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  // Update the session state from 'init' to 'scanned'
  const { data, error } = await supabase
    .from("sessions")
    .update({ state: "scanned" })
    .eq("token", token)
    .eq("state", "init") // Only update if it's in the correct previous state
    .select()
    .single();

  if (error || !data) {
    console.error("Supabase update error on scan:", error);
    // This is not a critical failure for the user, so we send a success response.
    // The session might have been scanned on another device, for example.
    return res.status(200).json({ status: "ok", message: "Session already in a different state or not found." });
  }

  res.status(200).json({ status: "ok" });
}