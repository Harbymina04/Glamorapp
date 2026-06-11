import { create } from 'zustand';

export interface CartItem {
  id: string;
  productId?: string;
  serviceId?: string;
  itemType: 'product' | 'service' | 'package';
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;           // per-unit discount from campaign
  ivaRate: number;                  // IVA % for this item (Colombia: 19, 5, 0)
  isIvaExcluded?: boolean;          // true = excluido de IVA (no aplica)
  appliedDiscountPercent?: number;  // % applied — for badge/strikethrough display
  discountId?: string;              // which campaign applied
  categoryId?: string;              // for discount matching
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  discountPercent: number;
  discounts: any[];                // active campaigns loaded from API
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  setCustomer: (id: string, name: string) => void;
  setDiscount: (percent: number) => void;
  setDiscounts: (discounts: any[]) => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTax: () => number;
  getTotal: () => number;
  getIvaBreakdown: () => { rate: number; base: number; amount: number }[];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  discountPercent: 0,
  discounts: [],

  addItem: (item) => {
    const items = get().items;
    const existing = items.find(i =>
      i.productId === item.productId && i.serviceId === item.serviceId
    );
    if (existing) {
      set({
        items: items.map(i =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ items: [...items, { ...item, id: crypto.randomUUID() }] });
    }
  },

  removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),

  updateQuantity: (id, qty) => {
    if (qty <= 0) { get().removeItem(id); return; }
    set({ items: get().items.map(i => i.id === id ? { ...i, quantity: qty } : i) });
  },

  clearCart: () => set({ items: [], customerId: null, customerName: null, discountPercent: 0 }),
  setCustomer: (id, name) => set({ customerId: id, customerName: name }),
  setDiscount: (percent) => set({ discountPercent: percent }),
  setDiscounts: (discounts) => set({ discounts }),

  // Subtotal net of per-item campaign discounts (scales with quantity)
  getSubtotal: () =>
    get().items.reduce((s, i) => s + (i.unitPrice - i.discountAmount) * i.quantity, 0),

  // Sale-level cashier override discount applied on top of campaign-discounted subtotal
  getDiscountAmount: () => {
    const sub = get().getSubtotal();
    return sub * (get().discountPercent / 100);
  },

  // IVA calculated per item using each product's individual rate
  getTax: () => {
    const saleDisco = get().getDiscountAmount();
    const sub = get().getSubtotal();
    // Distribute sale-level discount proportionally across items
    const discountRatio = sub > 0 ? saleDisco / sub : 0;
    return get().items.reduce((total, i) => {
      if (i.isIvaExcluded) return total;
      const lineBase = (i.unitPrice - i.discountAmount) * i.quantity;
      const lineAfterDiscount = lineBase * (1 - discountRatio);
      return total + lineAfterDiscount * ((i.ivaRate ?? 19) / 100);
    }, 0);
  },

  getTotal: () => {
    const sub = get().getSubtotal();
    const saleDisco = get().getDiscountAmount();
    const tax = get().getTax();
    return (sub - saleDisco) + tax;
  },

  // Returns IVA grouped by rate for the tirilla / receipt breakdown
  getIvaBreakdown: () => {
    const saleDisco = get().getDiscountAmount();
    const sub = get().getSubtotal();
    const discountRatio = sub > 0 ? saleDisco / sub : 0;
    const map = new Map<number, { base: number; amount: number }>();
    get().items.forEach(i => {
      const rate = i.isIvaExcluded ? 0 : (i.ivaRate ?? 19);
      const lineBase = (i.unitPrice - i.discountAmount) * i.quantity * (1 - discountRatio);
      const ivaAmount = i.isIvaExcluded ? 0 : lineBase * (rate / 100);
      const prev = map.get(rate) ?? { base: 0, amount: 0 };
      map.set(rate, { base: prev.base + lineBase, amount: prev.amount + ivaAmount });
    });
    return Array.from(map.entries())
      .map(([rate, v]) => ({ rate, base: v.base, amount: v.amount }))
      .sort((a, b) => b.rate - a.rate);
  },
}));

// ─── Helper: find the best applicable discount for a cart item ────

export function getApplicableDiscount(
  item: {
    productId?: string;
    serviceId?: string;
    itemType: string;
    categoryId?: string;
  },
  discounts: any[],
): any | null {
  if (!discounts?.length) return null;

  const matches = discounts.filter(d => {
    const ids: string[] = Array.isArray(d.targetIds) ? d.targetIds : [];
    if (d.scope === 'all') return true;
    if (d.scope === 'services' && item.itemType === 'service') return true;
    if (d.scope === 'products' && item.itemType === 'product') {
      return ids.length === 0 || ids.includes(item.productId ?? '');
    }
    if (d.scope === 'category' && item.itemType === 'product') {
      return item.categoryId != null && ids.includes(item.categoryId);
    }
    return false;
  });

  if (!matches.length) return null;
  // Return the highest discount when multiple apply
  return matches.reduce((best, d) =>
    Number(d.discountPercent) > Number(best.discountPercent) ? d : best,
  );
}
