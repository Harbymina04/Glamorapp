import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Glamorapp · Gestiona la belleza de tu negocio',
  description: 'La plataforma todo‑en‑uno con agentes de IA para salones de belleza, spas y estudios de uñas.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
