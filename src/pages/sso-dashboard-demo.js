import Head from 'next/head';
import { parse, serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

// This is a mock of a user database lookup.
const findUserById = async (userId) => {
  if (userId) {
    return { id: userId, name: 'Demo User', email: `user-${userId}@example.com` };
  }
  return null;
};

export default function SsoDashboardDemo({ user }) {
  return (
    <>
      <Head>
        <title>SSO Protected Page</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
          {user ? (
            <div>
              <h1 className="text-2xl font-bold text-green-600 mb-4">
                Authentication Successful!
              </h1>
              <p className="text-gray-800">
                Welcome, <span className="font-semibold">{user.name}</span>!
              </p>
              <p className="text-gray-600 text-sm mt-2">
                (User ID: {user.id})
              </p>
              <p className="mt-4">
                This page confirms that the SSO flow worked and your site has successfully created a session.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Access Denied
              </h1>
              <p className="text-gray-800">
                You are not logged in. Please go through the authentication flow to access this page.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  const { req, res, query } = context;
  const { token } = query;
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const authCookie = cookies['demo-auth'];

  // 1. If user has a valid session cookie, they are logged in.
  if (authCookie) {
    try {
      const user = JSON.parse(authCookie);
      return { props: { user } };
    } catch (e) {
      console.error("Failed to parse auth cookie:", e);
      // Invalid cookie, proceed to check for token
    }
  }

  // 2. If no cookie, but a token is in the URL, try to log them in.
  if (token) {
    try {
      const decodedPayload = jwt.decode(token);
      if (!decodedPayload || !decodedPayload.embedId) {
        throw new Error("Invalid token: missing embedId.");
      }

      const { data: embed, error: embedError } = await supabaseAdmin
        .from('embeds')
        .select('jwt_secret')
        .eq('id', decodedPayload.embedId)
        .single();

      if (embedError || !embed || !embed.jwt_secret) {
        console.error(`[SSO Login] Could not find secret for embed ${decodedPayload.embedId}`, embedError);
        throw new Error("Could not verify token source.");
      }

      const decoded = jwt.verify(token, embed.jwt_secret);
      
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid token structure after verification.");
      }
      const { userId } = decoded;

      const user = await findUserById(userId);
      if (!user) {
        throw new Error('User not found.');
      }

      // Set the session cookie
      const cookie = serialize('demo-auth', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        path: '/',
        maxAge: 60 * 15, // 15 minutes
        sameSite: 'lax',
      });
      res.setHeader('Set-Cookie', cookie);

      // Redirect to the same page, but without the token in the URL
      return {
        redirect: {
          destination: '/sso-dashboard-demo',
          permanent: false,
        },
      };

    } catch (error) {
      console.error('[SSO Dashboard] Token verification failed:', error.message);
      // If token is invalid, redirect to a clean version of the page to avoid loops
      return {
        redirect: {
          destination: '/sso-dashboard-demo',
          permanent: false,
        },
      };
    }
  }

  // 3. If no cookie and no token, the user is not logged in.
  return {
    props: {
      user: null,
    },
  };
}