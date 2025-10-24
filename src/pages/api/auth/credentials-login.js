import { supabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";
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

  const { email, password, sessionToken } = req.body;

  if (!email || !password || !sessionToken) {
    return res.status(400).json({ error: "Email, password, and session token are required." });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, password_hash, external_user_id")
    .eq("email", email)
    .single();

  if (userError || !user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid email or password." });
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
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;

  let destinationUrl = embed.success_url_a || (session.user_role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
  destinationUrl = makeAbsoluteUrl(destinationUrl, session.client_origin);

  let finalSuccessUrl = destinationUrl;

  if (embed.jwt_secret) {
    // Use external_user_id if available, falling back to the internal id for older accounts
    const jwtUserId = user.external_user_id || user.id;
    const authToken = jwt.sign(
      { userId: jwtUserId, embedId: embed.id, role: session.user_role },
      embed.jwt_secret,
      { expiresIn: '1d' }
    );
    const loginUrl = new URL('/api/auth/login', appUrl);
    loginUrl.searchParams.set('token', authToken);
    loginUrl.searchParams.set('redirectUrl', destinationUrl);
    finalSuccessUrl = loginUrl.toString();
  }

  await supabaseAdmin
    .from("sessions")
    .update({ state: "verified", verified_at: new Date().toISOString(), success_url: destinationUrl })
    .eq("token", sessionToken);

  const channel = supabaseAdmin.channel(`session-updates-${sessionToken}`);
  channel.send({
    type: 'broadcast',
    event: 'VERIFICATION_SUCCESS',
    payload: { state: 'verified', successUrl: finalSuccessUrl },
  });

  res.status(200).json({ status: "ok", successUrl: finalSuccessUrl });
}