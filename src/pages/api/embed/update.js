import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { 
    id, 
    component_type,
    success_url_a, 
    jwt_secret, 
    role_id, 
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
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Embed ID is required.' });
  }

  const updateData = {};

  if (component_type !== undefined) updateData.component_type = component_type;
  if (success_url_a !== undefined) updateData.success_url_a = success_url_a.trim();
  if (jwt_secret !== undefined) updateData.jwt_secret = jwt_secret;
  if (role_id !== undefined) updateData.role_id = role_id === '' ? null : role_id;
  if (mobile_otp_enabled !== undefined) updateData.mobile_otp_enabled = mobile_otp_enabled;
  if (credentials_enabled !== undefined) updateData.credentials_enabled = credentials_enabled;
  if (google_auth_enabled !== undefined) updateData.google_auth_enabled = google_auth_enabled;
  if (github_auth_enabled !== undefined) updateData.github_auth_enabled = github_auth_enabled;
  if (qr_code_enabled !== undefined) updateData.qr_code_enabled = qr_code_enabled;
  if (card_title !== undefined) updateData.card_title = card_title;
  if (card_price !== undefined) updateData.card_price = card_price;
  if (card_features !== undefined) updateData.card_features = card_features;
  if (card_button_text !== undefined) updateData.card_button_text = card_button_text;
  if (card_button_link !== undefined) updateData.card_button_link = card_button_link;
  if (card_badge !== undefined) updateData.card_badge = card_badge;
  if (card_featured !== undefined) updateData.card_featured = card_featured;
  if (contact_form_recipient_email !== undefined) updateData.contact_form_recipient_email = contact_form_recipient_email;
  if (founder_name !== undefined) updateData.founder_name = founder_name;
  if (founder_title !== undefined) updateData.founder_title = founder_title;
  if (founder_bio !== undefined) updateData.founder_bio = founder_bio;
  if (founder_image_url !== undefined) updateData.founder_image_url = founder_image_url;
  if (chatbot_welcome_message !== undefined) updateData.chatbot_welcome_message = chatbot_welcome_message;
  if (chatbot_initial_questions !== undefined) updateData.chatbot_initial_questions = chatbot_initial_questions;

  if (Object.keys(updateData).length === 0) {
    // If no data is passed, we can just return a success message.
    return res.status(200).json({ message: 'No changes detected.' });
  }

  const { data, error } = await supabaseAdmin
    .from('embeds')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase error updating embed:', error);
    return res.status(500).json({ error: `Failed to update embed. DB error: ${error.message}` });
  }

  res.status(200).json(data);
}