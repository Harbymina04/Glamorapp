import type { Metadata } from 'next';

export const revalidate = 3600;
import { notFound } from 'next/navigation';
import { getStorefront, getStorefrontData } from '@/lib/store-server';
import { SalonClient } from './SalonClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

// ─── Dynamic metadata per salon ───────────────────────────────────

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const sf = await getStorefront(params.slug);
  if (!sf) return { title: 'Salón no encontrado | Glamorapp' };

  const title = `${sf.displayName} — ${sf.tagline || 'Salón de Belleza'} | Glamorapp`;
  const description = sf.description
    ? sf.description.slice(0, 160)
    : `Descubre los servicios, productos y diseños de ${sf.displayName}. Agenda tu cita online en Glamorapp.`;
  const image = sf.bannerUrl || sf.logoUrl || `${APP_URL}/og`;
  const url = `${APP_URL}/tienda/${params.slug}`;

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
      images: [{ url: image, width: 1200, height: 630, alt: sf.displayName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

// ─── Page ──────────────────────────────────────────────────────────

export default async function SalonPage({ params }: { params: { slug: string } }) {
  const sf = await getStorefront(params.slug);
  if (!sf) notFound();

  const data = await getStorefrontData(sf.tenantId);

  // ── JSON-LD LocalBusiness ──────────────────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: sf.displayName,
    description: sf.description || sf.tagline || '',
    url: `${APP_URL}/tienda/${params.slug}`,
    image: sf.bannerUrl || sf.logoUrl || undefined,
    telephone: sf.phone || undefined,
    ...(sf.averageRating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(Number(sf.averageRating).toFixed(1)),
        reviewCount: String(sf.totalReviews || 0),
        bestRating: '5',
      },
    }),
    ...(data.services.length > 0 && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Servicios',
        itemListElement: data.services.slice(0, 10).map((s: any) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: s.name,
            description: s.description || undefined,
          },
          price: String(Number(s.price || 0)),
          priceCurrency: 'COP',
        })),
      },
    }),
    sameAs: [
      sf.instagram ? `https://instagram.com/${sf.instagram.replace('@', '')}` : null,
      sf.website || null,
    ].filter(Boolean),
  };

  return (
    <>
      {/* <script> nativo (no next/script): debe ir en el HTML inicial del
          servidor para que los crawlers vean el structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SalonClient
        storefront={sf}
        products={data.products}
        services={data.services}
        designs={data.designs}
        reviews={data.reviews}
        locations={data.locations}
      />
    </>
  );
}
