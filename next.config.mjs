/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    allowedDevOrigins: ['http://127.0.0.1:32100', 'http://localhost:32100'],
  },
};

export default nextConfig;