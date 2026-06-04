import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import { getPublicProduct } from '@/lib/store-server';
import { ProductDetailClient } from './ProductDetailClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const product = await getPublicProduct(params.id);
  if (!product) return { title: 'Producto no encontrado | Glamorapp' };

  const title = `${product.name}${product.category?.name ? ` — ${product.category.name}` : ''} | Glamorapp`;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Compra ${product.name} en Glamorapp. Precio: $${Number(product.salePrice).toLocaleString('es-CO')} COP.`;
  const image = product.images?.[0]?.url || `${APP_URL}/og`;
  const url = `${APP_URL}/tienda/producto/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Glamorapp',
      locale: 'es_CO',
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  // Fetch server-side for initial render (Google can index this)
  const product = await getPublicProduct(params.id);

  return <ProductDetailClient id={params.id} initialProduct={product} />;
}
