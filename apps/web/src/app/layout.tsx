import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://glamorapp.co'),
  title: {
    default: 'Glamorapp — Gestión de Salón de Belleza con IA',
    template: '%s | Glamorapp',
  },
  description: 'Sistema de gestión inteligente para salones de belleza, spas y estudios de uñas con agentes IA.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/assets/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
