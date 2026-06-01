'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, Heart, ShoppingBag, User } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { CartDrawer } from '@/components/store/CartDrawer';

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'nails', label: 'Uñas' },
  { id: 'hair', label: 'Cabello' },
  { id: 'makeup', label: 'Maquillaje' },
  { id: 'skin', label: 'Piel' },
  { id: 'spa', label: 'Spa' },
  { id: 'offers', label: 'Ofertas' },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { count, favorites } = useStoreCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');

  const itemCount = count();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link href="/tienda" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EF2D8F] to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-extrabold text-lg text-gray-900">Glamorapp</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar productos, salones, servicios..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#EF2D8F]/30 focus:border-[#EF2D8F]/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Favorites */}
            <button className="relative p-2.5 rounded-full hover:bg-gray-100 transition">
              <Heart className="w-5 h-5 text-gray-600" />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EF2D8F] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Cart */}
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-full hover:bg-gray-100 transition">
              <ShoppingBag className="w-5 h-5 text-gray-600" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#EF2D8F] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Login */}
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#EF2D8F] text-white rounded-full text-sm font-semibold hover:bg-[#d4267e] transition"
            >
              <User className="w-4 h-4" />
              Ingresar
            </Link>
          </div>
        </div>

        {/* Category bar */}
        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:bg-pink-50 hover:text-[#EF2D8F] transition whitespace-nowrap"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1E1238] text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EF2D8F] to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="font-extrabold text-lg">Glamorapp</span>
            </div>
            <p className="text-gray-400 text-sm">La plataforma de belleza más completa de Colombia.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Descubrir</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/tienda" className="hover:text-white transition">Inicio</Link></li>
              <li><Link href="/tienda/catalogo" className="hover:text-white transition">Catálogo</Link></li>
              <li><Link href="/tienda" className="hover:text-white transition">Salones</Link></li>
              <li><Link href="/tienda" className="hover:text-white transition">Servicios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Para negocios</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/auth/register" className="hover:text-white transition">Registra tu salón</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition">Iniciar sesión</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition">Panel de control</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Contacto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>soporte@glamorapp.com</li>
              <li>+57 300 000 0000</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-center text-gray-500 text-xs">© 2026 Glamorapp. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
