import type { Metadata } from 'next';
import Script from 'next/script';

export const revalidate = 3600;
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
  const product = await getPublicProduct(params.id);

  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || undefined,
        image: product.images?.map((img: any) => img.url) ?? [],
        sku: product.id,
        brand: product.store?.name
          ? { '@type': 'Brand', name: product.store.name }
          : undefined,
        ...(product.category?.name && {
          category: product.category.name,
        }),
        offers: {
          '@type': 'Offer',
          url: `${APP_URL}/tienda/producto/${params.id}`,
          priceCurrency: 'COP',
          price: String(Number(product.salePrice)),
          availability:
            product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          seller: product.store?.name
            ? { '@type': 'Organization', name: product.store.name }
            : undefined,
        },
        ...(product.averageRating > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(Number(product.averageRating).toFixed(1)),
            reviewCount: String(product.totalReviews || 0),
            bestRating: '5',
          },
        }),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <Script
          id={`json-ld-product-${params.id}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetailClient id={params.id} initialProduct={product} />
    </>
  );
}
