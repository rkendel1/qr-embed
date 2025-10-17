/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowed: {
    origins: ['localhost:3000', '192.168.1.204:3000'],
  },
};

export default nextConfig;
