import { useEffect, useState, useCallback } from "react";

const KEY = "abc_cart";

export type CartItem = {
  id: string;
  product_name: string;
  price: number;
  qty: number;
  image_url?: string | null;
  brand?: string | null;
  tire_size?: string | null;
  stock?: number;
};

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:updated"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(read());
    const refresh = () => setItems(read());
    window.addEventListener("cart:updated", refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) refresh();
    });
    return () => window.removeEventListener("cart:updated", refresh);
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    const current = read();
    const existing = current.find((c) => c.id === item.id);
    if (existing) existing.qty += qty;
    else current.push({ ...item, qty });
    write(current);
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    const current = read()
      .map((c) => (c.id === id ? { ...c, qty: Math.max(1, qty) } : c));
    write(current);
  }, []);

  const removeItem = useCallback((id: string) => {
    write(read().filter((c) => c.id !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  const subtotal = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return { items, addItem, updateQty, removeItem, clear, subtotal, count };
}

export function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () => setCount(read().reduce((s, i) => s + i.qty, 0));
    refresh();
    window.addEventListener("cart:updated", refresh);
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) refresh();
    });
    return () => window.removeEventListener("cart:updated", refresh);
  }, []);
  return count;
}
