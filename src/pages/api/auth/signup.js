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

  const { data: session, error: fetchError } = await supabaseAdmin
    .from("sessions")
    .select("*, user_role, client_origin, embeds(id, success_url_a, jwt_secret)")
    .eq("token", sessionToken)
    .single();

  if (fetchError || !session) {
    return res.status(404).json({ error: "Session not found." });
  }

  const password_hash = await bcrypt.hash(password, 10);

  // Step 1: Create the user
  const { data: newUser, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({ email, password_hash })
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') { // Unique violation
      return res.status(409).json({ error: "A user with this email already exists." });
    }
    console.error("Signup Error:", insertError);
    return res.status(500).json({ error: "Could not create user." });
  }

  // Step 2: Set the external_user_id to match the internal id for consistency
  const { data: updatedUser, error: updateError } = await supabaseAdmin
    .from('users')
    .update({ external_user_id: newUser.id })
    .eq('id', newUser.id)
    .select('external_user_id')
    .single();

  if (updateError) {
    console.error("Signup user finalization error:", updateError);
    return res.status(500).json({ error: "Could not finalize user account." });
  }

  // Now, log the user in by verifying the session
  const embed = session.embeds;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;

  let destinationUrl = embed.success_url_a || (session.user_role === 'admin' ? '/admin-dashboard' : '/user-dashboard');
  destinationUrl = makeAbsoluteUrl(destinationUrl, session.client_origin);

  let finalSuccessUrl = destinationUrl;

  if (embed.jwt_secret) {
    const authToken = jwt.sign(
      { userId: updatedUser.external_user_id, embedId: embed.id, role: session.user_role },
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

  res.status(201).json({ status: "ok", successUrl: finalSuccessUrl });
}