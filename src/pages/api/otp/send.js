import twilio from "twilio";
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { token: sessionToken, phoneNumber } = req.body;
  if (!sessionToken || !phoneNumber) {
    return res.status(400).json({ error: "Token and phone number are required." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  let formattedPhoneNumber = phoneNumber;
  if (!formattedPhoneNumber.startsWith('+')) {
    formattedPhoneNumber = `+1${phoneNumber.replace(/\D/g, '')}`;
  }

  // --- SMS Sending Logic ---
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, OTP_JWT_SECRET } = process.env;

  if (!OTP_JWT_SECRET) {
    console.error("[OTP] CRITICAL: OTP_JWT_SECRET is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    console.log("[OTP] Twilio credentials found. Attempting to send SMS.");
    try {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your verification code is: ${otp}`,
        from: TWILIO_PHONE_NUMBER,
        to: formattedPhoneNumber,
      });
      console.log(`[Twilio] OTP sent to ${formattedPhoneNumber}`);
    } catch (error) {
      console.error("[Twilio] SMS sending failed:", error.message);
      console.log(`[DEMO] Fallback OTP for failed send to ${formattedPhoneNumber} is: ${otp}`);
      // We no longer return a 500 error here. We log it and proceed.
    }
  } else {
    console.warn("[OTP] Twilio credentials not found in .env.local. Using demo mode.");
    console.log(`[DEMO] SMS provider not configured. OTP for session ${sessionToken} is: ${otp}`);
  }
  // --- End SMS Sending Logic ---

  // Create a short-lived JWT to hold the OTP data
  const otpToken = jwt.sign(
    { sessionToken, phoneNumber: formattedPhoneNumber, otp },
    OTP_JWT_SECRET,
    { expiresIn: '10m' } // OTP is valid for 10 minutes
  );

  res.status(200).json({ otpToken });
}