'use client';

import { useEffect, useState } from 'react';
import { Heart, Minus, Plus, ShoppingBag, CheckCircle, Store } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { storeApi, formatCOP } from '@/lib/store-utils';
import { StarRating } from '@/components/store/StarRating';
import { ProductCard } from '@/components/store/ProductCard';

type Tab = 'descripcion' | 'resenas' | 'similares';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { addItem, toggleFavorite, isFavorite, updateQty, items } = useStoreCart();

  const [product, setProduct] = useState<any>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('descripcion');
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const cartItem = items.find(i => i.productId === id);
  const fav = isFavorite(id);

  useEffect(() => {
    if (!id) return;
    // Fetch product by ID using the products endpoint with id filter
    storeApi.get(`/storefront/public/products/${id}`)
      .then(found => {
        setProduct(found);
        // Load similar products from same category
        if (found?.tenantId) {
          storeApi.get(`/storefront/public/products?tenantId=${found.tenantId}&limit=8`)
            .then((res: any) => {
              const all = Array.isArray(res) ? res : [];
              setSimilar(all.filter((p: any) => p.id !== id).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addItem({ productId: product.id, name: product.name, price: Number(product.salePrice), shopName: '', tenantId: product.tenantId, imageUrl: product.images?.[0]?.url });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-square bg-gray-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-100 rounded w-1/4" />
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
            <div className="h-12 bg-gray-100 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Producto no encontrado</p>
      </div>
    );
  }

  const gradients: Record<string, string> = { default: 'from-pink-200 to-purple-300' };
  const grad = gradients.default;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Product main */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: images */}
        <div className="space-y-3">
          <div className="sticky top-20 space-y-3">
            {/* Main image */}
            <div className={`aspect-square rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`}>
              {product.images?.[activeImg]?.url ? (
                <img
                  src={product.images[activeImg].url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-200"
                />
              ) : (
                <ShoppingBag className="w-20 h-20 text-white/60" />
              )}
            </div>
            {/* Thumbnail strip — only shown when product has images */}
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img: any, i: number) => (
                  <button
                    key={img.id || i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden border-2 transition-all ${
                      i === activeImg
                        ? 'border-[#EF2D8F] shadow-md'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img.url} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: info */}
        <div className="space-y-5">
          {product.category?.name && (
            <span className="inline-block px-3 py-1 bg-pink-50 text-[#EF2D8F] text-xs font-semibold rounded-full border border-pink-200">
              {product.category.name}
            </span>
          )}
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>

          <StarRating rating={4.5} count={24} size="md" />

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-gray-900">{formatCOP(Number(product.salePrice))}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm text-green-600 font-medium">En stock ({product.currentStock})</span>
          </div>

          {/* Qty stepper */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-4 py-3 hover:bg-gray-50 transition border-r border-gray-200">
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-6 py-3 text-base font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)}
                className="px-4 py-3 hover:bg-gray-50 transition border-l border-gray-200">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <button onClick={handleAdd}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition ${
                added ? 'bg-green-500' : 'bg-[#EF2D8F] hover:bg-[#d4267e]'
              }`}>
              {added ? <><CheckCircle className="w-5 h-5" /> Agregado</> : <><ShoppingBag className="w-5 h-5" /> Agregar al carrito</>}
            </button>
            <button onClick={() => toggleFavorite(product.id)}
              className={`p-3.5 rounded-xl border-2 transition ${
                fav ? 'border-[#EF2D8F] bg-pink-50 text-[#EF2D8F]' : 'border-gray-200 text-gray-400 hover:border-[#EF2D8F] hover:text-[#EF2D8F]'
              }`}>
              <Heart className={`w-6 h-6 ${fav ? 'fill-[#EF2D8F]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {(['descripcion', 'resenas', 'similares'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition capitalize ${
                tab === t ? 'border-[#EF2D8F] text-[#EF2D8F]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'descripcion' ? 'Descripción' : t === 'resenas' ? 'Reseñas' : 'Productos similares'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'descripcion' && (
        <div className="prose max-w-none text-gray-600">
          {product.description || product.storeDescription || <p className="text-gray-400">Sin descripción disponible.</p>}
        </div>
      )}

      {tab === 'resenas' && (
        <div className="text-center py-12 text-gray-400">
          <p>Las reseñas de este producto estarán disponibles pronto.</p>
        </div>
      )}

      {tab === 'similares' && (
        similar.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similar.map(p => (
              <ProductCard key={p.id} id={p.id} name={p.name}
                price={Number(p.salePrice)} imageUrl={p.images?.[0]?.url}
                category={p.category?.name} tenantId={p.tenantId} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No hay productos similares disponibles.</p>
          </div>
        )
      )}
    </div>
  );
}
