'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link href="/dashboard" className="hover:text-foreground transition">
        <Home className="w-4 h-4" />
      </Link>
      {segments.slice(1).map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          <span className="capitalize">{seg.replace(/-/g, ' ')}</span>
        </span>
      ))}
    </nav>
  );
}
