import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // Clear the authentication cookie by setting its expiration date to the past.
  const cookie = serialize('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    expires: new Date(0), // Expire the cookie immediately
    sameSite: 'lax',
  });

  res.setHeader('Set-Cookie', cookie);
  
  // Redirect to the homepage after logging out.
  res.redirect(307, '/');
}