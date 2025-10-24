import { supabaseAdmin } from "@/lib/supabase-admin";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { templateToken, fingerprint, userId, email, name, role, origin: clientOrigin } = req.body;

    if (!templateToken) {
      res.status(400).json({ error: "Embed token is required" });
      return;
    }

    // 1. Verify the embed exists and is active, and get its assigned role
    const { data: embed, error: embedError } = await supabaseAdmin
      .from('embeds')
      .select('*, roles(name)')
      .eq('template_token', templateToken)
      .single();

    if (embedError || !embed) {
      console.error("Embed lookup failed:", embedError);
      res.status(404).json({ error: "Embed configuration not found." });
      return;
    }

    if (!embed.is_active) {
      res.status(403).json({ error: "This embed is currently inactive." });
      return;
    }

    const componentType = embed.component_type || 'qr_auth';
    
    const socialProviders = [];
    if (embed.google_auth_enabled) socialProviders.push('google');
    if (embed.github_auth_enabled) socialProviders.push('github');

    // Handle non-auth components that don't need a session
    const nonAuthComponentTypes = ['pricing_card', 'founder_profile', 'contact_form', 'chatbot'];
    if (nonAuthComponentTypes.includes(componentType)) {
      let componentProps = {};
      switch (componentType) {
        case 'pricing_card':
          componentProps = { title: embed.card_title, price: embed.card_price, features: embed.card_features, buttonText: embed.card_button_text, buttonLink: embed.card_button_link, badge: embed.card_badge, featured: embed.card_featured };
          break;
        case 'founder_profile':
          componentProps = { name: embed.founder_name, title: embed.founder_title, bio: embed.founder_bio, imageUrl: embed.founder_image_url };
          break;
        case 'contact_form':
          componentProps = { recipient: embed.contact_form_recipient_email };
          break;
        case 'chatbot':
          componentProps = { welcomeMessage: embed.chatbot_welcome_message, initialQuestions: embed.chatbot_initial_questions };
          break;
      }
      res.status(200).json({ componentType, componentProps, templateToken });
      return;
    }
    
    // For social login, we don't need a session yet, just the config.
    if (componentType === 'social_login') {
      res.status(200).json({ 
        componentType, 
        componentProps: { providers: socialProviders }, 
        templateToken 
      });
      return;
    }

    if (!fingerprint) {
      res.status(400).json({ error: "Fingerprint is required for Auth embeds" });
      return;
    }

    // 2. Always create a new session for other Auth embeds.
    const sessionToken = uuidv4();
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    let origin;

    if (appUrl) {
      origin = appUrl;
    } else if (process.env.NODE_ENV === 'development') {
      // Fallback for dev if NEXT_PUBLIC_APP_URL is not set
      const host = req.headers.host;
      const protocol = 'http';
      origin = `${protocol}://${host}`;
    } else {
      // Production logic
      origin = clientOrigin || (() => {
        const host = req.headers.host;
        const protocol = 'https';
        return `${protocol}://${host}`;
      })();
    }

    if (!origin) {
      const errorMessage = "Server configuration error: Could not determine origin URL.";
      console.error(errorMessage);
      res.status(500).json({ error: errorMessage });
      return;
    }
    
    const qrUrl = `${origin}/session/${sessionToken}`;
    
    // Determine role: Use the role from the embed config first, then fallback to the role passed in the script, then to 'user'.
    const sessionUserRole = embed.roles?.name || role || 'user';

    const { data: newSession, error: insertError } = await supabaseAdmin
      .from("sessions")
      .insert({
        token: sessionToken,
        state: "loaded",
        embed_id: embed.id,
        fingerprint: fingerprint,
        qr_url: qrUrl,
        loaded_at: new Date().toISOString(),
        external_user_id: userId,
        external_user_email: email,
        external_user_name: name,
        user_role: sessionUserRole,
        client_origin: clientOrigin,
      })
      .select()
      .single();

    if (insertError || !newSession) {
      console.error("Supabase insert error on load:", insertError);
      res.status(500).json({ error: "Failed to create session." });
      return;
    }

    if (componentType === 'mobile_otp' || componentType === 'magic_link') {
      res.status(200).json({ 
        componentType, 
        sessionToken: newSession.token,
      });
      return;
    }

    // Default to qr_auth logic
    const { default: QRCode } = await import("qrcode");
    let qrDataUrl = null;
    if (embed.qr_code_enabled) {
      qrDataUrl = await QRCode.toDataURL(qrUrl);
    }

    res.status(200).json({ 
      componentType, 
      qrDataUrl, 
      sessionToken: newSession.token,
      mobileOtpEnabled: embed.mobile_otp_enabled,
      credentialsEnabled: embed.credentials_enabled,
      socialProviders: socialProviders,
      templateToken: templateToken
    });
  } catch (error) {
    console.error("[/api/embed/load] Unhandled exception:", error);
    res.status(500).json({ error: "An internal server error occurred while loading the embed." });
  }
}