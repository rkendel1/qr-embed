import { supabaseAdmin } from "@/lib/supabase-admin";
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { templateToken, name, email, message } = req.body;

  if (!templateToken || !name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const { data: embed } = await supabaseAdmin
      .from('embeds')
      .select('contact_form_recipient_email')
      .eq('template_token', templateToken)
      .single();

    if (!embed || !embed.contact_form_recipient_email) {
      return res.status(404).json({ error: 'Recipient not configured for this form.' });
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL } = process.env;

    if (!SMTP_HOST || !SMTP_FROM_EMAIL) {
      console.error("[Contact Form] SMTP not configured.");
      return res.status(500).json({ error: "Server's email service is not configured." });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: parseInt(SMTP_PORT, 10) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });

    await transporter.sendMail({
      from: SMTP_FROM_EMAIL,
      to: embed.contact_form_recipient_email,
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      text: message,
      html: `<p>You have a new submission from:</p>
             <p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong></p>
             <p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    res.status(200).json({ message: 'Message sent successfully.' });

  } catch (error) {
    console.error("[Contact Form] Error:", error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
}