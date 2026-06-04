import type { MetadataRoute } from 'next';
import { getPublicStores, getPublicProducts } from '@/lib/store-server';

export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const static_routes: MetadataRoute.Sitemap = [
    { url: BASE,                          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1   },
    { url: `${BASE}/tienda`,              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/tienda/catalogo`,     lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/auth/register`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/auth/login`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dynamic salon pages
  const stores = await getPublicStores().catch(() => []);
  const salon_routes: MetadataRoute.Sitemap = (stores as any[]).map(s => ({
    url: `${BASE}/tienda/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic product pages (first 100)
  const products = await getPublicProducts(100).catch(() => []);
  const product_routes: MetadataRoute.Sitemap = (products as any[]).map(p => ({
    url: `${BASE}/tienda/producto/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...static_routes, ...salon_routes, ...product_routes];
}
