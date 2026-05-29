/** @type {import('next').NextConfig} */

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Build Content-Security-Policy header value
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, // unsafe-eval needed by Next.js dev; restrict in prod
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, // Tailwind + Google Fonts CSS
  `img-src 'self' data: blob: ${API_ORIGIN}`,        // allow images from API server
  `font-src 'self' https://fonts.gstatic.com`,       // Google Fonts actual font files
  `connect-src 'self' ${API_ORIGIN}`,                // API fetch calls
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
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
