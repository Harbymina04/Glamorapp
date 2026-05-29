import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Glamorapp — Gestión de Salón de Belleza',
  description: 'Sistema de gestión inteligente para salones de belleza con agentes IA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
