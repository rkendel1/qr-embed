import { NextResponse } from 'next/server';

const isDevelopment = process.env.NODE_ENV !== 'production';

// In production, you should configure a specific list of allowed origins from an environment variable.
const allowedProdOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

function isOriginAllowed(origin) {
  // If there's no origin, it's not a CORS request we need to handle.
  if (!origin) return false;

  if (isDevelopment) {
    // Allow any localhost or local IP origin in development, regardless of port.
    try {
      const { hostname } = new URL(origin);
      return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch (e) {
      return false;
    }
  } else {
    // In production, check against the configured list of allowed origins.
    return allowedProdOrigins.includes(origin);
  }
}

export function middleware(request) {
  const origin = request.headers.get('origin');
  const isCorsRequest = !!origin;
  const isAllowed = isOriginAllowed(origin);

  // Pass the request headers to the next handler. This is crucial for preserving cookies.
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Handle preflight requests (OPTIONS)
  if (request.method === 'OPTIONS') {
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Cookie');
    }
    return response;
  }

  // Handle actual requests
  if (isCorsRequest) {
    if (request.nextUrl.pathname === '/embed.js') {
      // The embed script can be loaded from any origin.
      response.headers.set('Access-Control-Allow-Origin', '*');
    } else if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/embed.js'],
};