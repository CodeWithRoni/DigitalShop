'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem } from '@/lib/types';

type Ctx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  update: (index: number, patch: Partial<CartItem>) => void;
  remove: (index: number) => void;
  clear: () => void;
  count: number;
  total: number;
  ready: boolean;
};
const CartContext = createContext<Ctx | null>(null);
const KEY = 'ds_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const add = (item: CartItem) =>
    setItems((prev) => {
      const i = prev.findIndex((p) => p.packageId === item.packageId && p.deliveryInfo === item.deliveryInfo);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(50, next[i].quantity + item.quantity) };
        return next;
      }
      return [...prev, item];
    });
  const update = (index: number, patch: Partial<CartItem>) =>
    setItems((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  const remove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, update, remove, clear, count, total, ready }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error('useCart must be inside CartProvider');
  return c;
}
