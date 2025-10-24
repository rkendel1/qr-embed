import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const token = cookies['auth-token'];

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decodedPayload = jwt.decode(token);
    if (!decodedPayload || !decodedPayload.embedId) {
      throw new Error("Invalid token: missing embedId.");
    }

    const { data: embed } = await supabaseAdmin
      .from('embeds')
      .select('jwt_secret')
      .eq('id', decodedPayload.embedId)
      .single();

    if (!embed || !embed.jwt_secret) {
      throw new Error("Could not verify token source.");
    }

    const { userId } = jwt.verify(token, embed.jwt_secret);
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('external_user_id', userId);

    if (updateError) {
      console.error('Error completing onboarding:', updateError);
      throw new Error('Failed to update onboarding status.');
    }

    res.status(200).json({ message: 'Onboarding completed successfully.' });

  } catch (error) {
    console.error("[/api/users/complete-onboarding] Error:", error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}