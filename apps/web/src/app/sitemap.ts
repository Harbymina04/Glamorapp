import type { MetadataRoute } from 'next';
import { getPublicStores, getPublicProducts } from '@/lib/store-server';

export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes (las páginas de auth no aportan a búsqueda — fuera del sitemap)
  const static_routes: MetadataRoute.Sitemap = [
    { url: BASE,                      lastModified: new Date(), changeFrequency: 'weekly', priority: 1   },
    { url: `${BASE}/tienda`,          lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE}/tienda/catalogo`, lastModified: new Date(), changeFrequency: 'daily',  priority: 0.8 },
  ];

  // Dynamic salon pages — lastModified real cuando el API lo expone
  const stores = await getPublicStores().catch(() => []);
  const salon_routes: MetadataRoute.Sitemap = (stores as any[]).map(s => ({
    url: `${BASE}/tienda/${s.slug}`,
    lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic product pages
  const products = await getPublicProducts(500).catch(() => []);
  const product_routes: MetadataRoute.Sitemap = (products as any[]).map(p => ({
    url: `${BASE}/tienda/producto/${p.id}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : (p.createdAt ? new Date(p.createdAt) : new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...static_routes, ...salon_routes, ...product_routes];
}
