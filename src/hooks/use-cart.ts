import { useEffect, useState } from "react";

const KEY = "abc_cart_count";

export function useCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const raw = window.localStorage.getItem(KEY);
      setCount(raw ? Number(raw) || 0 : 0);
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:updated", read as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:updated", read as EventListener);
    };
  }, []);

  return count;
}
