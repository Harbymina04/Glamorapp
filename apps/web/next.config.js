/** @type {import('next').NextConfig} */

// Internal API address for server-side proxy (rewrites) — never changes
const API_INTERNAL = 'http://localhost:3001';

// Public-facing origin for CSP — uses env var when set (production domain)
const API_PUBLIC = process.env.NEXT_PUBLIC_API_BASE_URL || API_INTERNAL;

// Build Content-Security-Policy header value
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, // unsafe-eval needed by Next.js dev; restrict in prod
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, // Tailwind + Google Fonts CSS
  `img-src 'self' data: blob: ${API_PUBLIC}`,        // allow images from API server
  `font-src 'self' https://fonts.gstatic.com`,       // Google Fonts actual font files
  `connect-src 'self' ${API_PUBLIC}`,                // API fetch calls
  `media-src 'none'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,                          // prevent clickjacking
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
    ];
  },
};

module.exports = nextConfig;
