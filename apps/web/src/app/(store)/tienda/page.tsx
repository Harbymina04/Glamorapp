'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ShopCard } from '@/components/store/ShopCard';
import { ServiceCard } from '@/components/store/ServiceCard';
import { NailDesignCard } from '@/components/store/NailDesignCard';
import { storeApi } from '@/lib/store-utils';

const CATEGORIES = ['Todos', 'Uñas', 'Cabello', 'Maquillaje', 'Piel', 'Spa'];

export default function StorePage() {
  const [shops, setShops] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      storeApi.get('/storefront/public').catch(() => []),
      storeApi.get('/storefront/public/products?limit=20').catch(() => []),
      storeApi.get('/storefront/public/services?limit=9').catch(() => []),
      storeApi.get('/storefront/public/designs?limit=8').catch(() => []),
    ]).then(([sh, pr, sv, ds]) => {
      setShops(Array.isArray(sh) ? sh : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setServices(Array.isArray(sv) ? sv : []);
      setDesigns(Array.isArray(ds) ? ds : []);
    }).finally(() => setLoading(false));
  }, []);

  const filteredProducts = activeCategory === 'Todos'
    ? products
    : products.filter(p => {
        const cat = (p.category?.name || '').toLowerCase();
        return cat.includes(activeCategory.toLowerCase());
      });

  return (
    <div>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-24 px-4 text-white"
        style={{ background: 'linear-gradient(135deg, #EF2D8F 0%, #8B5CF6 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Más de 500 salones de belleza
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Tu belleza, a un click<br />de distancia.
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Encuentra los mejores productos, servicios y diseños de uñas de los salones de tu ciudad.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tienda/catalogo"
              className="px-8 py-3.5 bg-white text-[#EF2D8F] rounded-full font-bold hover:bg-gray-50 transition flex items-center gap-2 justify-center">
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/register"
              className="px-8 py-3.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/30 transition">
              Registra tu salón
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 space-y-16 py-12">
        {/* Featured Shops */}
        {shops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">⭐ Salones destacados</h2>
              <Link href="/tienda" className="text-sm text-[#EF2D8F] font-semibold hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {shops.map(shop => (
                <ShopCard key={shop.id} id={shop.id} name={shop.displayName}
                  slug={shop.slug} type={shop.businessType} rating={Number(shop.averageRating)}
                  reviewCount={shop.totalReviews} tags={Array.isArray(shop.tags) ? shop.tags : []} />
              ))}
            </div>
          </section>
        )}

        {/* Popular Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">🔥 Productos populares</h2>
            <Link href="/tienda/catalogo" className="text-sm text-[#EF2D8F] font-semibold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  activeCategory === cat
                    ? 'bg-[#EF2D8F] text-white border-transparent'
                    : 'border-gray-200 text-gray-600 hover:border-[#EF2D8F] hover:text-[#EF2D8F]'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No hay productos disponibles en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.slice(0, 10).map(p => (
                <ProductCard key={p.id} id={p.id} name={p.name}
                  price={Number(p.salePrice)} shopName={p.tenantId}
                  imageUrl={p.images?.[0]?.url} category={p.category?.name}
                  tenantId={p.tenantId} />
              ))}
            </div>
          )}
        </section>

        {/* Services */}
        {services.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💅 Servicios más buscados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(s => (
                <ServiceCard key={s.id} id={s.id} name={s.name}
                  category={s.category} price={Number(s.price)}
                  durationMinutes={s.durationMinutes}
                  allowsBooking={s.allowsOnlineBooking} />
              ))}
            </div>
          </section>
        )}

        {/* Nail Designs */}
        {designs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💫 Diseños tendencia</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {designs.map(d => (
                <NailDesignCard key={d.id} id={d.id} name={d.name}
                  technique={d.technique} price={d.suggestedPrice ? Number(d.suggestedPrice) : undefined}
                  imageUrl={d.imageUrl} />
              ))}
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <section className="rounded-2xl bg-[#1E1238] text-white p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">¿Tienes un salón?</h2>
          <p className="text-gray-300 text-lg mb-8">Registra tu negocio gratis y llega a miles de nuevos clientes.</p>
          <Link href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#EF2D8F] text-white rounded-full font-bold hover:bg-[#d4267e] transition">
            Registra tu negocio gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
