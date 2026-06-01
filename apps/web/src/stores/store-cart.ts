import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StoreCartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  shopName: string;
  tenantId: string;
  imageUrl?: string;
}

interface StoreCartStore {
  items: StoreCartItem[];
  favorites: string[]; // productIds
  addItem: (item: Omit<StoreCartItem, 'qty'>) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  total: () => number;
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
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, qty } : i,
          ),
        });
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
      total: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      count: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: 'glamorapp-store-cart' },
  ),
);
