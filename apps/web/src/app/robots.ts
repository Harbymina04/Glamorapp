import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login', '/auth/register', '/tienda/'],
        // Block internal app routes from being indexed
        disallow: [
          '/dashboard/',
          '/tenant/',
          '/admin/',
          '/api/',
          '/auth/reset-password',
          '/auth/forgot-password',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
