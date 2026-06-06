import type { Metadata } from 'next';

export const revalidate = 3600;
import { getPublicStores, getPublicProducts, getPublicDesigns } from '@/lib/store-server';
import { StoreHomeClient } from './StoreHomeClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const metadata: Metadata = {
  title: 'Tienda de Belleza — Productos, Servicios y Diseños | Glamorapp',
  description: 'Descubre los mejores salones de belleza, productos, servicios y diseños de uñas cerca de ti. Agenda tu cita online en Glamorapp.',
  alternates: { canonical: `${APP_URL}/tienda` },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/tienda`,
    title: 'Tienda de Belleza | Glamorapp',
    description: 'Los mejores salones de belleza, productos y diseños de uñas en un solo lugar.',
    siteName: 'Glamorapp',
    locale: 'es_CO',
    images: [{ url: `${APP_URL}/og`, width: 1200, height: 630, alt: 'Glamorapp Tienda' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tienda de Belleza | Glamorapp',
    description: 'Los mejores salones de belleza, productos y diseños de uñas.',
    images: [`${APP_URL}/og`],
  },
};

async function getStoreBanner(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/platform/config`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.storeBannerUrl ?? null;
  } catch {
    return null;
  }
}

export default async function StorePage() {
  const [shops, products, designs, bannerUrl] = await Promise.all([
    getPublicStores(),
    getPublicProducts(20),
    getPublicDesigns(8),
    getStoreBanner(),
  ]);

  return (
    <StoreHomeClient
      shops={shops}
      products={products}
      designs={designs}
      bannerUrl={bannerUrl}
    />
  );
}
