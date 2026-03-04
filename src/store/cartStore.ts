import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
import type { CartItem, Product } from '../types';
import { CART_PERSIST_KEY, RECENT_PRODUCTS_COUNT } from '../constants';

const storage = createMMKV({ id: 'duka-cart' });

interface CartState {
  items: CartItem[];
  recentProducts: string[]; // product IDs of last N scanned/added

  // Computed
  subtotal: () => number;
  discountTotal: () => number;
  total: () => number;
  itemCount: () => number;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyItemDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  restoreCart: () => void;
  persistCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  recentProducts: [],

  subtotal: () => get().items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
  discountTotal: () => get().items.reduce((sum, item) => sum + item.discount_amount, 0),
  total: () => get().subtotal() - get().discountTotal(),
  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  addItem: (product: Product, quantity = 1) => {
    const { items, recentProducts } = get();
    const existing = items.find((i) => i.product_id === product.id);

    if (existing) {
      const newQty = existing.quantity + quantity;
      set({
        items: items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: newQty, line_total: i.unit_price * newQty - i.discount_amount }
            : i
        ),
      });
    } else {
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity,
        unit_price: product.selling_price,
        discount_amount: 0,
        line_total: product.selling_price * quantity,
        max_stock: product.current_stock,
      };
      set({ items: [...items, newItem] });
    }

    // Track recent products (team insight: last 8 scanned)
    const updatedRecent = [
      product.id,
      ...recentProducts.filter((id) => id !== product.id),
    ].slice(0, RECENT_PRODUCTS_COUNT);
    set({ recentProducts: updatedRecent });

    get().persistCart();
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter((i) => i.product_id !== productId) });
    get().persistCart();
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity, line_total: i.unit_price * quantity - i.discount_amount }
          : i
      ),
    });
    get().persistCart();
  },

  applyItemDiscount: (productId: string, discount: number) => {
    set({
      items: get().items.map((i) =>
        i.product_id === productId
          ? { ...i, discount_amount: discount, line_total: i.unit_price * i.quantity - discount }
          : i
      ),
    });
    get().persistCart();
  },

  clearCart: () => {
    set({ items: [] });
    storage.remove(CART_PERSIST_KEY);
  },

  restoreCart: () => {
    const saved = storage.getString(CART_PERSIST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({ items: parsed.items || [], recentProducts: parsed.recentProducts || [] });
      } catch {
        // Corrupted cart data, ignore
      }
    }
  },

  persistCart: () => {
    const { items, recentProducts } = get();
    storage.set(CART_PERSIST_KEY, JSON.stringify({ items, recentProducts }));
  },
}));
