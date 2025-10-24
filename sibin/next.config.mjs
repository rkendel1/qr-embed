
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_QR_EMBED_URL;
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_QR_EMBED_URL is not set. API rewrites will not be configured.');
      return [];
    }
    return [
      {
        source: '/api/auth/:path*',
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${apiUrl}/api/users/:path*`,
      },
    ]
  },
};

export default nextConfig;
    