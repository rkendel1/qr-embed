import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { 
      name,
      app_id,
      component_type = 'qr_auth',
      success_url_a = '', 
      jwt_secret,
      role_id,
      mobile_otp_enabled = false,
      credentials_enabled = false,
      google_auth_enabled = false,
      github_auth_enabled = false,
      qr_code_enabled = false,
      card_title,
      card_price,
      card_features,
      card_button_text,
      card_button_link,
      card_badge,
      card_featured,
      contact_form_recipient_email,
      founder_name,
      founder_title,
      founder_bio,
      founder_image_url,
      chatbot_welcome_message,
      chatbot_initial_questions,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Embed name is required" });
    }

    const token = uuidv4();

    const { data: embed, error: embedError } = await supabaseAdmin
      .from('embeds')
      .insert({ 
        name, 
        app_id: app_id || null,
        template_token: token, 
        is_active: true,
        component_type,
        success_url_a,
        jwt_secret: jwt_secret || null,
        role_id: role_id || null,
        mobile_otp_enabled,
        credentials_enabled,
        google_auth_enabled,
        github_auth_enabled,
        qr_code_enabled,
        card_title,
        card_price,
        card_features,
        card_button_text,
        card_button_link,
        card_badge,
        card_featured,
        contact_form_recipient_email,
        founder_name,
        founder_title,
        founder_bio,
        founder_image_url,
        chatbot_welcome_message,
        chatbot_initial_questions,
      })
      .select()
      .single();

    if (embedError) {
      console.error("Supabase insert error on embed create:", embedError);
      return res.status(500).json({ error: `Database error: ${embedError.message}` });
    }

    res.status(201).json(embed);
  } catch (error) {
    console.error("[/api/embed/create] Unhandled exception:", error);
    res.status(500).json({ error: "An internal server error occurred while creating the embed." });
  }
}