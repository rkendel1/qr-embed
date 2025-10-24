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
    OTP_JWT_SECRET 
  } = process.env;

  if (!OTP_JWT_SECRET) {
    console.error("[OTP Email] CRITICAL: OTP_JWT_SECRET is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASSWORD && SMTP_FROM_EMAIL) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: SMTP_FROM_EMAIL,
        to: email,
        subject: 'Your Verification Code',
        html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
      });
      console.log(`[SMTP] OTP sent to ${email}`);
    } catch (error) {
      console.error("[SMTP] Email sending failed:", error);
      // Don't block dev flow if SMTP fails
      console.log(`[DEMO] Fallback OTP for failed send to ${email} is: ${otp}`);
    }
  } else {
    console.warn("[OTP Email] SMTP credentials not found. Using demo mode.");
    console.log(`[DEMO] Email provider not configured. OTP for ${email} is: ${otp}`);
  }

  const otpToken = jwt.sign(
    { sessionToken, email, otp },
    OTP_JWT_SECRET,
    { expiresIn: '10m' }
  );

  res.status(200).json({ otpToken });
}