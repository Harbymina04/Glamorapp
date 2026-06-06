/** @type {import('next').NextConfig} */

// Internal API address for server-side proxy (rewrites) — never changes
const API_INTERNAL = 'http://localhost:3001';

// Public-facing origin for CSP — uses env var when set (production domain)
const API_PUBLIC = process.env.NEXT_PUBLIC_API_BASE_URL || API_INTERNAL;

// Build Content-Security-Policy header value
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: ${API_PUBLIC} https://i.ytimg.com https://*.ytimg.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' ${API_PUBLIC} https://www.youtube.com`,
  `frame-src https://www.youtube.com https://www.youtube-nocookie.com`,
  `media-src 'none'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy',        value: csp },
  { key: 'X-Frame-Options',                value: 'DENY' },
  { key: 'X-Content-Type-Options',         value: 'nosniff' },
  { key: 'Referrer-Policy',                value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',             value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control',         value: 'on' },
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Server-side proxy: Next.js forwards /api/* to NestJS internally.
        // Always uses the internal address so it works in both dev and prod.
        source: '/api/:path*',
        destination: `${API_INTERNAL}/api/:path*`,
      },
      {
        // Proxy uploads (product images, nail designs, etc.) through Next.js.
        // This way image URLs like /uploads/products/... work without needing
        // an absolute host prefix in every <img src>.
        source: '/uploads/:path*',
        destination: `${API_INTERNAL}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
