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
  const { magicToken } = req.body;

  if (!magicToken) {
    return res.status(400).json({ error: "Magic token is required" });
  }

  const { OTP_JWT_SECRET } = process.env; // Re-using secret
  if (!OTP_JWT_SECRET) {
    console.error("[Magic Link] CRITICAL: OTP_JWT_SECRET is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  let decoded;
  try {
    decoded = jwt.verify(magicToken, OTP_JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired magic link." });
  }

  const { sessionToken, email } = decoded;

  if (!sessionToken || !email) {
    return res.status(400).json({ error: "Invalid token payload." });
  }

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*, user_role, client_origin, embeds(id, success_url_a, jwt_secret)")
    .eq("token", sessionToken)
    .single();

  if (fetchError || !session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const embed = session.embeds;
  if (!embed) {
      return res.status(500).json({ error: "Internal server error: Missing embed configuration." });
  }

  // JIT Provisioning
  if (session.external_user_id) {
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({ external_user_id: session.external_user_id }, { onConflict: 'external_user_id' });
    if (userError) {
      console.error("JIT Provisioning Error:", userError);
      return res.status(500).json({ error: "Failed to provision user account." });
    }
  }

  // Determine success URL
  let baseUrl = embed.success_url_a;
  let destinationUrl;
  if (baseUrl && baseUrl.trim()) {
    destinationUrl = baseUrl.trim();
  } else if (session.user_role === 'admin') {
    destinationUrl = '/admin-dashboard';
  } else {
    destinationUrl = '/user-dashboard';
  }
  destinationUrl = makeAbsoluteUrl(destinationUrl, session.client_origin);

  let finalSuccessUrl = destinationUrl;

  // Handle SSO
  if (session.external_user_id && embed.jwt_secret) {
    const authToken = jwt.sign(
      { userId: session.external_user_id, embedId: embed.id, role: session.user_role },
      embed.jwt_secret,
      { expiresIn: '1d' }
    );
    
    const loginUrl = new URL('/api/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    loginUrl.searchParams.set('token', authToken);
    if (destinationUrl) {
      loginUrl.searchParams.set('redirectUrl', destinationUrl);
    }
    finalSuccessUrl = loginUrl.toString();
  }

  // Update session to 'verified'
  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ 
      state: "verified", 
      verified_at: new Date().toISOString(),
      success_url: destinationUrl,
      // We can store the email used for verification
      external_user_email: email,
    })
    .eq("token", sessionToken);

  if (updateError) {
    return res.status(500).json({ error: `Failed to verify session: ${updateError.message}` });
  }

  // Broadcast success to any listening clients (like the original embed page)
  const channel = supabaseAdmin.channel(`session-updates-${sessionToken}`);
  channel.send({
    type: 'broadcast',
    event: 'VERIFICATION_SUCCESS',
    payload: { state: 'verified', successUrl: finalSuccessUrl },
  });

  res.status(200).json({ status: "ok", successUrl: finalSuccessUrl });
}