import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { token: sessionToken, email } = req.body;
  if (!sessionToken || !email) {
    return res.status(400).json({ error: "Token and email are required." });
  }

  const { 
    SMTP_HOST, 
    SMTP_PORT, 
    SMTP_USER, 
    SMTP_PASSWORD, 
    SMTP_FROM_EMAIL,
    OTP_JWT_SECRET, // Re-using this secret for simplicity
    NEXT_PUBLIC_APP_URL
  } = process.env;

  if (!OTP_JWT_SECRET) {
    console.error("[Magic Link] CRITICAL: OTP_JWT_SECRET is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  // Create a short-lived JWT for the magic link
  const magicToken = jwt.sign(
    { sessionToken, email },
    OTP_JWT_SECRET,
    { expiresIn: '15m' } // Magic link is valid for 15 minutes
  );

  const host = req.headers.host;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appUrl = NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  const magicLink = `${appUrl}/magic-link/${magicToken}`;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASSWORD && SMTP_FROM_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: SMTP_FROM_EMAIL,
        to: email,
        subject: 'Your Magic Login Link',
        html: `<p>Click the link below to log in:</p><p><a href="${magicLink}">Log in to your account</a></p><p>This link will expire in 15 minutes.</p>`,
      });
      console.log(`[SMTP] Magic link sent to ${email}`);
    } catch (error) {
      console.error("[SMTP] Magic link sending failed:", error);
      console.log(`[DEMO] Fallback magic link for failed send to ${email} is: ${magicLink}`);
    }
  } else {
    console.warn("[Magic Link] SMTP credentials not found. Using demo mode.");
    console.log(`[DEMO] Email provider not configured. Magic link for ${email} is: ${magicLink}`);
  }

  res.status(200).json({ message: "Magic link sent." });
}