import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StoreCartItem {
  productId: string;
  name: string;
  price: number;           // effective (discounted) price
  originalPrice?: number;  // original price before discount (for display)
  discountPercent?: number; // % discount applied
  qty: number;
  shopName: string;
  tenantId: string;
  imageUrl?: string;
  categoryId?: string;
}

interface StoreCartStore {
  items: StoreCartItem[];
  favorites: string[];
  addItem: (item: Omit<StoreCartItem, 'qty'>) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  total: () => number;
  subtotalBeforeDiscounts: () => number;
  totalDiscountAmount: () => number;
  count: () => number;
}

export const useStoreCart = create<StoreCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      favorites: [],
      addItem: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i,
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, qty: 1 }] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      updateQty: (productId, qty) => {
        if (qty <= 0) { get().removeItem(productId); return; }
        set({ items: get().items.map((i) => i.productId === productId ? { ...i, qty } : i) });
      },
      clearCart: () => set({ items: [] }),
      toggleFavorite: (productId) => {
        const favs = get().favorites;
        set({
          favorites: favs.includes(productId)
            ? favs.filter((f) => f !== productId)
            : [...favs, productId],
        });
      },
      isFavorite: (productId) => get().favorites.includes(productId),
      // Total using effective (discounted) price
      total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      // Gross total before any discounts (for showing savings)
      subtotalBeforeDiscounts: () =>
        get().items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.qty, 0),
      // Total savings amount
      totalDiscountAmount: () => {
        const items = get().items;
        return items.reduce((s, i) => {
          const saving = (i.originalPrice ?? i.price) - i.price;
          return s + saving * i.qty;
        }, 0);
      },
      count: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: 'glamorapp-store-cart' },
  ),
);

// ─── Helper: find the best applicable storefront discount ─────────

export function getStorefrontDiscount(
  product: { id: string; categoryId?: string; tenantId?: string },
  discounts: any[],
): any | null {
  if (!discounts?.length) return null;

  const matches = discounts.filter(d => {
    if (d.tenantId && d.tenantId !== product.tenantId) return false;
    const ids: string[] = Array.isArray(d.targetIds) ? d.targetIds : [];
    if (d.scope === 'all') return true;
    if (d.scope === 'products') return ids.length === 0 || ids.includes(product.id);
    if (d.scope === 'category')
      return product.categoryId != null && ids.includes(product.categoryId);
    return false;
  });

  if (!matches.length) return null;
  return matches.reduce((best: any, d: any) =>
    Number(d.discountPercent) > Number(best.discountPercent) ? d : best,
  );
}
