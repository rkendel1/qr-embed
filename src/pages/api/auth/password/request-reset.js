import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (!user) {
    // Still return 200 to prevent email enumeration attacks
    return res.status(200).json({ message: "If a user with that email exists, a reset link has been sent." });
  }

  const { 
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL,
    OTP_JWT_SECRET, // Re-using for simplicity
    NEXT_PUBLIC_APP_URL
  } = process.env;

  if (!OTP_JWT_SECRET) {
    console.error("[Password Reset] CRITICAL: OTP_JWT_SECRET is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  const host = req.headers.host;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appUrl = NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  const resetToken = jwt.sign({ userId: user.id }, OTP_JWT_SECRET, { expiresIn: '1h' });
  const resetLink = `${appUrl}/password-reset/${resetToken}`;

  if (SMTP_HOST && SMTP_FROM_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: SMTP_FROM_EMAIL,
        to: user.email,
        subject: 'Reset Your Password',
        html: `<p>Click the link to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p>`,
      });
    } catch (error) {
      console.error("[SMTP] Password reset email failed:", error);
    }
  } else {
    console.warn("[Password Reset] SMTP not configured. Demo link:", resetLink);
  }

  res.status(200).json({ message: "If a user with that email exists, a reset link has been sent." });
}