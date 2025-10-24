import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required." });
  }

  const { OTP_JWT_SECRET } = process.env;
  if (!OTP_JWT_SECRET) {
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const { userId } = jwt.verify(token, OTP_JWT_SECRET);
    const password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabaseAdmin
      .from("users")
      .update({ password_hash })
      .eq("id", userId);

    if (error) throw error;

    res.status(200).json({ message: "Password has been reset successfully." });

  } catch (error) {
    console.error("Password reset error:", error);
    res.status(401).json({ error: "Invalid or expired token." });
  }
}