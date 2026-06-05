import type { Metadata } from 'next';

export const revalidate = 3600;
import { getPublicStores, getPublicProducts, getPublicDesigns } from '@/lib/store-server';
import { StoreHomeClient } from './StoreHomeClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

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

export default async function StorePage() {
  const [shops, products, designs] = await Promise.all([
    getPublicStores(),
    getPublicProducts(20),
    getPublicDesigns(8),
  ]);

  return (
    <StoreHomeClient
      shops={shops}
      products={products}
      designs={designs}
    />
  );
}
