"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types/database";

// Default ceiling. The actual cap can be overridden per-bar via BarConfig
// (passed to addItem/updateQuantity). This is the absolute upper bound.
export const MAX_ITEM_QUANTITY = 99;
const CART_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

const clampQty = (n: number, max: number) =>
  Math.min(Math.max(0, Math.floor(n)), Math.min(max, MAX_ITEM_QUANTITY));

interface CartStore {
  items: CartItem[];
  tableNumber: number | null;
  barSlug: string | null;
  lastActivityAt: number | null;
  setTable: (tableNumber: number, barSlug: string) => void;
  addItem: (product: Product, quantity?: number, notes?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  resetForNewContext: (tableNumber: number, barSlug: string) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const touch = () => ({ lastActivityAt: Date.now() });

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableNumber: null,
      barSlug: null,
      lastActivityAt: null,

      setTable: (tableNumber, barSlug) =>
        set({ tableNumber, barSlug, ...touch() }),

      addItem: (product, quantity = 1, notes = "") => {
        const items = get().items;
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          const newQty = clampQty(existing.quantity + quantity, MAX_ITEM_QUANTITY);
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: newQty } : i
            ),
            ...touch(),
          });
        } else {
          set({
            items: [
              ...items,
              { product, quantity: clampQty(quantity, MAX_ITEM_QUANTITY), notes },
            ],
            ...touch(),
          });
        }
      },

      removeItem: (productId) =>
        set({
          items: get().items.filter((i) => i.product.id !== productId),
          ...touch(),
        }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: clampQty(quantity, MAX_ITEM_QUANTITY) }
              : i
          ),
          ...touch(),
        });
      },

      updateNotes: (productId, notes) =>
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, notes } : i
          ),
          ...touch(),
        }),

      // Vacía solo los productos. La mesa se mantiene para permitir
      // hacer un nuevo pedido sin reintroducirla.
      clearCart: () => set({ items: [], ...touch() }),

      // Vacía el carrito y fija mesa/bar nuevos. Para usar cuando el contexto
      // del cliente cambia (otro bar, otra mesa, o sesión caducada).
      resetForNewContext: (tableNumber, barSlug) =>
        set({
          items: [],
          tableNumber,
          barSlug,
          lastActivityAt: Date.now(),
        }),

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    }),
    {
      name: "appbar-cart",
      onRehydrateStorage: () => (state) => {
        if (
          state?.lastActivityAt &&
          Date.now() - state.lastActivityAt > CART_TTL_MS
        ) {
          state.items = [];
          state.tableNumber = null;
          state.barSlug = null;
          state.lastActivityAt = null;
        }
      },
    }
  )
);
