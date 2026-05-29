'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Scissors } from 'lucide-react';

export default function InventoryIndex() {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona productos y servicios</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/inventory/products"
          className="group bg-white rounded-xl border border-border-primary p-6 hover:border-glamor-primary/40 hover:shadow-card-hover transition"
        >
          <div className="w-12 h-12 rounded-xl bg-glamor-primary/10 flex items-center justify-center mb-4 group-hover:bg-glamor-primary/20 transition">
            <Package className="w-6 h-6 text-glamor-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Productos</h2>
          <p className="text-sm text-muted-foreground">Gestiona productos, stock, categorías y precios</p>
        </Link>

        <Link
          href="/dashboard/inventory/services"
          className="group bg-white rounded-xl border border-border-primary p-6 hover:border-glamor-primary/40 hover:shadow-card-hover transition"
        >
          <div className="w-12 h-12 rounded-xl bg-glamor-primary/10 flex items-center justify-center mb-4 group-hover:bg-glamor-primary/20 transition">
            <Scissors className="w-6 h-6 text-glamor-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Servicios</h2>
          <p className="text-sm text-muted-foreground">Gestiona servicios, precios, duración y categorías</p>
        </Link>
      </div>
    </div>
  );
}
