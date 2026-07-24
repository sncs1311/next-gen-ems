/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy all /api calls to the Express backend (SRS §4.2 — Next.js proxies to hide
  // raw backend URL from the browser, per SRS §4.7 auth architecture).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
