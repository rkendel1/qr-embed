import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from 'jsonwebtoken';

const makeAbsoluteUrl = (url, origin) => {
  if (!url || !origin || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  try {
    return new URL(url, origin).toString();
  } catch (e) {
    console.warn(`[makeAbsoluteUrl] Could not create absolute URL for: ${url} with origin: ${origin}`);
    return url;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const { token, fingerprint: mobileFingerprint } = req.body;

    if (!token || !mobileFingerprint) {
      return res.status(400).json({ error: "Token and fingerprint are required" });
    }

    const { data: session, error: fetchError } = await supabaseAdmin
      .from("sessions")
      .select("*, user_role, client_origin, embeds(id, success_url_a, jwt_secret)")
      .eq("token", token)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: "Session not found." });
    }

    const embed = session.embeds;
    if (!embed) {
        return res.status(500).json({ error: "Internal server error: Missing embed configuration." });
    }

    if (session.state !== 'scanned') {
      return res.status(409).json({ error: `Cannot approve session in state: ${session.state}` });
    }

    // --- JIT Provisioning ---
    if (session.external_user_id) {
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          external_user_id: session.external_user_id,
        }, {
          onConflict: 'external_user_id',
        });

      if (userError) {
        console.error("JIT Provisioning Error:", userError);
        return res.status(500).json({ error: "Failed to provision user account." });
      }
    }
    // --- End JIT Provisioning ---

    let baseUrl = embed.success_url_a;
    
    let destinationUrl;
    if (baseUrl && baseUrl.trim()) {
      destinationUrl = baseUrl.trim();
    } else if (session.user_role === 'admin') {
      destinationUrl = '/admin-dashboard';
    } else {
      destinationUrl = '/user-dashboard';
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;
    destinationUrl = makeAbsoluteUrl(destinationUrl, session.client_origin);

    let finalSuccessUrl = destinationUrl;

    if (session.external_user_id && embed.jwt_secret) {
      const authToken = jwt.sign(
        { 
          userId: session.external_user_id, 
          embedId: embed.id,
          role: session.user_role,
        },
        embed.jwt_secret,
        { expiresIn: '1d' }
      );
      
      const loginUrl = new URL('/api/auth/login', appUrl);
      loginUrl.searchParams.set('token', authToken);
      if (destinationUrl) {
        loginUrl.searchParams.set('redirectUrl', destinationUrl);
      }
      finalSuccessUrl = loginUrl.toString();
    } else if (session.external_user_id) {
      console.warn(`[approve] JWT SSO was requested for embed ${embed.id} but no JWT Secret is configured.`);
    }

    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update({ 
        state: "verified", 
        mobile_fingerprint: mobileFingerprint, 
        verified_at: new Date().toISOString(),
        success_url: destinationUrl,
      })
      .eq("token", token);

    if (updateError) {
      return res.status(500).json({ error: `Failed to approve session: ${updateError.message}` });
    }

    res.status(200).json({ status: "ok", successUrl: destinationUrl });

    const channel = supabaseAdmin.channel(`session-updates-${token}`);
    channel.send({
      type: 'broadcast',
      event: 'VERIFICATION_SUCCESS',
      payload: { state: 'verified', successUrl: finalSuccessUrl },
    });
  } catch (error) {
    console.error("[/api/session/approve] Unhandled exception:", error);
    res.status(500).json({ error: "An internal server error occurred during session approval." });
  }
}