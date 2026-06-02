import type { Metadata } from 'next';
import Script from 'next/script';
import '@/app/globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

const TITLE = 'Glamorapp · Software para Salones de Belleza con IA';
const DESCRIPTION =
  'La plataforma todo‑en‑uno con agentes de IA para salones de belleza, spas y estudios de uñas en Latinoamérica. Agenda, inventario, ventas POS, clientes y reportes en un solo lugar. 14 días gratis.';
const OG_IMAGE = `${APP_URL}/og`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'software salón de belleza',
    'sistema gestión spa',
    'agenda online salón',
    'software estudio uñas',
    'pos salón de belleza',
    'agente IA salón',
    'gestión clientes belleza',
    'inventario salón colombia',
    'glamorapp',
    'software belleza latinoamerica',
  ],
  authors: [{ name: 'Glamorapp', url: APP_URL }],
  creator: 'Glamorapp',
  publisher: 'Glamorapp',
  category: 'Software de gestión empresarial',

  alternates: {
    canonical: APP_URL,
    languages: { 'es-CO': APP_URL },
  },

  openGraph: {
    type: 'website',
    url: APP_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Glamorapp',
    locale: 'es_CO',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Glamorapp — Software para Salones de Belleza con IA',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
    creator: '@glamorapp',
    site: '@glamorapp',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    // google: 'TU_GOOGLE_SEARCH_CONSOLE_TOKEN',  // descomenta al verificar
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Glamorapp',
      url: APP_URL,
      description: DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'COP',
        lowPrice: '49900',
        highPrice: '199900',
        offerCount: 3,
      },
      featureList: [
        'Agendamiento de citas',
        'Punto de venta POS',
        'Inventario y stock',
        'CRM de clientes',
        'Agentes de IA por WhatsApp',
        'Reportes y comisiones',
        'Multi-sucursal',
        'Facturación electrónica',
      ],
      screenshot: `${APP_URL}/og`,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '120',
        bestRating: '5',
      },
    },
    {
      '@type': 'Organization',
      name: 'Glamorapp',
      url: APP_URL,
      logo: `${APP_URL}/assets/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: 'Spanish',
        email: 'soporte@glamorapp.com',
      },
      sameAs: [
        'https://instagram.com/glamorapp',
        'https://twitter.com/glamorapp',
      ],
    },
    {
      '@type': 'WebSite',
      url: APP_URL,
      name: 'Glamorapp',
      description: DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${APP_URL}/tienda/{search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Cuánto cuesta Glamorapp?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Glamorapp tiene planes desde $49.900 COP/mes. Todos los planes incluyen 14 días de prueba gratuita sin necesidad de tarjeta de crédito.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué incluye el plan gratuito de prueba?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'El período de prueba de 14 días incluye acceso completo al Plan Profesional: agendamiento, ventas POS, inventario, clientes, reportes y el agente IA Glamy en WhatsApp.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Puedo usar Glamorapp para múltiples sucursales?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí. El Plan Profesional soporta hasta 2 sucursales y el Plan Empresarial tiene sucursales ilimitadas, todo desde un único panel de administración.',
          },
        },
      ],
    },
  ],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
