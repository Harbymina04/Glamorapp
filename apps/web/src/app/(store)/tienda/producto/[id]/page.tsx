import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

export const revalidate = 3600;
import { getPublicProduct } from '@/lib/store-server';
import { extractProductId, productPath } from '@/lib/product-url';
import { ProductDetailClient } from './ProductDetailClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const productId = extractProductId(params.id);
  const product = await getPublicProduct(productId);
  if (!product) return { title: 'Producto no encontrado | Glamorapp' };

  const title = `${product.name}${product.category?.name ? ` — ${product.category.name}` : ''} | Glamorapp`;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Compra ${product.name} en Glamorapp. Precio: $${Number(product.salePrice).toLocaleString('es-CO')} COP.`;
  const image = product.images?.[0]?.url || `${APP_URL}/og`;
  // Canónica siempre en la forma con slug, aunque entren por el UUID pelado
  const url = `${APP_URL}${productPath(product)}`;

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
  const productId = extractProductId(params.id);
  const product = await getPublicProduct(productId);

  // 301: URLs viejas (UUID pelado) o con slug desactualizado → forma canónica
  if (product) {
    const canonical = productPath(product);
    if (decodeURIComponent(params.id) !== canonical.split('/').pop()) {
      permanentRedirect(canonical);
    }
  }

  const jsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || undefined,
        image: product.images?.map((img: any) => img.url) ?? [],
        sku: product.sku || product.id,
        brand: product.store?.name
          ? { '@type': 'Brand', name: product.store.name }
          : undefined,
        ...(product.category?.name && {
          category: product.category.name,
        }),
        offers: {
          '@type': 'Offer',
          url: `${APP_URL}${productPath(product)}`,
          priceCurrency: 'COP',
          price: String(Number(product.salePrice)),
          availability:
            Number(product.currentStock) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          seller: product.store?.name
            ? { '@type': 'Organization', name: product.store.name }
            : undefined,
        },
      }
    : null;

  return (
    <>
      {/* <script> nativo (no next/script): debe ir en el HTML inicial del
          servidor para que los crawlers vean el structured data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetailClient id={productId} initialProduct={product} />
    </>
  );
}
