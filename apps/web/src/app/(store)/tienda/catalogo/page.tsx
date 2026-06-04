import type { Metadata } from 'next';
import { CatalogoClient } from './CatalogoClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co';

export const metadata: Metadata = {
  title: 'Catálogo de Productos de Belleza | Glamorapp',
  description: 'Explora el catálogo completo de productos de belleza: esmaltes, cremas, herramientas y más de los mejores salones de Colombia.',
  alternates: { canonical: `${APP_URL}/tienda/catalogo` },
  openGraph: {
    type: 'website',
    url: `${APP_URL}/tienda/catalogo`,
    title: 'Catálogo de Productos de Belleza | Glamorapp',
    description: 'Esmaltes, cremas, herramientas y más productos de los mejores salones de Colombia.',
    siteName: 'Glamorapp',
    locale: 'es_CO',
    images: [{ url: `${APP_URL}/og`, width: 1200, height: 630 }],
  },
};

export default function CatalogoPage() {
  return <CatalogoClient />;
}
