import { create } from 'zustand';

interface CartItem {
  id: string;
  productId?: string;
  serviceId?: string;
  itemType: 'product' | 'service' | 'package';
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  discountPercent: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  setCustomer: (id: string, name: string) => void;
  setDiscount: (percent: number) => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  discountPercent: 0,

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

  getSubtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
  getDiscountAmount: () => {
    const { discountPercent, items } = get();
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return subtotal * (discountPercent / 100);
  },
  getTax: () => {
    const { discountPercent, items } = get();
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return (subtotal - subtotal * (discountPercent / 100)) * 0.16;
  },
  getTotal: () => {
    const { discountPercent, items } = get();
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discount = subtotal * (discountPercent / 100);
    return (subtotal - discount) * 1.16;
  },
}));
