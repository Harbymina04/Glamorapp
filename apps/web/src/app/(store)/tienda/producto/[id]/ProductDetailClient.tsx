'use client';

import { useEffect, useState } from 'react';
import { Heart, Minus, Plus, ShoppingBag, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { useStoreCart } from '@/stores/store-cart';
import { storeApi, formatCOP } from '@/lib/store-utils';
import { StarRating } from '@/components/store/StarRating';
import { ProductCard } from '@/components/store/ProductCard';
import { ReviewCard } from '@/components/store/ReviewCard';

type Tab = 'descripcion' | 'resenas' | 'similares';

interface Props {
  id: string;
  initialProduct?: any;
}

export function ProductDetailClient({ id, initialProduct }: Props) {
  const { addItem, toggleFavorite, isFavorite } = useStoreCart();

  const [product, setProduct] = useState<any>(initialProduct || null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('descripcion');
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const fav = isFavorite(id);

  const load = () => {
    setLoading(true);
    setError(false);
    storeApi.get(`/storefront/public/products/${id}`)
      .then(found => {
        setProduct(found);
        const tenantId = found?.tenantId;
        Promise.allSettled([
          tenantId ? storeApi.get(`/storefront/public/products?tenantId=${tenantId}&limit=8`) : Promise.resolve([]),
          storeApi.get(`/storefront/reviews?productId=${id}`),
        ]).then(([similarRes, reviewsRes]) => {
          if (similarRes.status === 'fulfilled') {
            const all = Array.isArray(similarRes.value) ? similarRes.value : [];
            setSimilar(all.filter((p: any) => p.id !== id).slice(0, 4));
          }
          if (reviewsRes.status === 'fulfilled') {
            setReviews(Array.isArray(reviewsRes.value) ? reviewsRes.value : []);
          }
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    if (!initialProduct) load();
    else {
      // load related data even if we have initial product
      const tenantId = initialProduct?.tenantId;
      Promise.allSettled([
        tenantId ? storeApi.get(`/storefront/public/products?tenantId=${tenantId}&limit=8`) : Promise.resolve([]),
        storeApi.get(`/storefront/reviews?productId=${id}`),
      ]).then(([similarRes, reviewsRes]) => {
        if (similarRes.status === 'fulfilled') {
          const all = Array.isArray(similarRes.value) ? similarRes.value : [];
          setSimilar(all.filter((p: any) => p.id !== id).slice(0, 4));
        }
        if (reviewsRes.status === 'fulfilled') {
          setReviews(Array.isArray(reviewsRes.value) ? reviewsRes.value : []);
        }
      });
    }
  }, [id]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : null;

  const handleAdd = () => {
    if (!product) return;
    for (let i = 0; i < qty; i++) {
      addItem({ productId: product.id, name: product.name, price: Number(product.salePrice), shopName: '', tenantId: product.tenantId, imageUrl: product.images?.[0]?.url });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 gap-10 animate-pulse">
        <div className="aspect-square bg-gray-100 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="h-8 bg-gray-100 rounded w-3/4" />
          <div className="h-12 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="max-w-7xl mx-auto px-4 py-32 flex flex-col items-center text-center">
      <AlertCircle className="w-14 h-14 mb-4 text-gray-300" />
      <p className="text-gray-500 mb-5">{error ? 'No se pudo cargar el producto.' : 'Producto no encontrado.'}</p>
      {error && <button onClick={load} className="px-5 py-2.5 bg-[#EF2D8F] text-white rounded-full text-sm font-semibold hover:bg-[#d4267e] transition">Reintentar</button>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="sticky top-20 space-y-3">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-pink-200 to-purple-300 flex items-center justify-center overflow-hidden">
              {product.images?.[activeImg]?.url
                ? <img src={product.images[activeImg].url} alt={product.name} className="w-full h-full object-cover" />
                : <ShoppingBag className="w-20 h-20 text-white/60" />
              }
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img: any, i: number) => (
                  <button key={img.id || i} onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden border-2 transition-all ${i === activeImg ? 'border-[#EF2D8F] shadow-md' : 'border-gray-200 hover:border-gray-400'}`}>
                    <img src={img.url} alt={`Vista ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          {product.category?.name && (
            <span className="inline-block px-3 py-1 bg-pink-50 text-[#EF2D8F] text-xs font-semibold rounded-full border border-pink-200">{product.category.name}</span>
          )}
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>
          {avgRating !== null
            ? <StarRating rating={avgRating} count={reviews.length} size="md" />
            : <div className="flex items-center gap-1.5 text-sm text-gray-400"><Star className="w-4 h-4" /> Sin calificaciones aún</div>
          }
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-gray-900">{formatCOP(Number(product.salePrice))}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm text-green-600 font-medium">En stock ({product.currentStock})</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 hover:bg-gray-50 transition border-r border-gray-200"><Minus className="w-4 h-4" /></button>
              <span className="px-6 py-3 text-base font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-3 hover:bg-gray-50 transition border-l border-gray-200"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition ${added ? 'bg-green-500' : 'bg-[#EF2D8F] hover:bg-[#d4267e]'}`}>
              {added ? <><CheckCircle className="w-5 h-5" /> Agregado</> : <><ShoppingBag className="w-5 h-5" /> Agregar al carrito</>}
            </button>
            <button onClick={() => toggleFavorite(product.id)}
              className={`p-3.5 rounded-xl border-2 transition ${fav ? 'border-[#EF2D8F] bg-pink-50 text-[#EF2D8F]' : 'border-gray-200 text-gray-400 hover:border-[#EF2D8F] hover:text-[#EF2D8F]'}`}>
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
              className={`pb-3 text-sm font-medium border-b-2 transition capitalize ${tab === t ? 'border-[#EF2D8F] text-[#EF2D8F]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'descripcion' ? 'Descripción' : t === 'resenas' ? `Reseñas${reviews.length > 0 ? ` (${reviews.length})` : ''}` : 'Productos similares'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'descripcion' && (
        <div className="prose max-w-none text-gray-600">
          {product.description || <p className="text-gray-400">Sin descripción disponible.</p>}
        </div>
      )}
      {tab === 'resenas' && (
        reviews.length > 0
          ? <div className="space-y-4 max-w-2xl">{reviews.map((r, i) => <ReviewCard key={r.id || i} review={r} />)}</div>
          : <div className="text-center py-12 text-gray-400"><Star className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">Sin reseñas aún.</p></div>
      )}
      {tab === 'similares' && (
        similar.length > 0
          ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{similar.map(p => <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.salePrice)} imageUrl={p.images?.[0]?.url} category={p.category?.name} tenantId={p.tenantId} />)}</div>
          : <div className="text-center py-12 text-gray-400"><p>No hay productos similares.</p></div>
      )}
    </div>
  );
}
