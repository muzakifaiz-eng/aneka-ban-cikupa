import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Zap, Search, ImageIcon, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/produk")({
  head: () => ({
    meta: [
      { title: "Produk Ban Vulkanisir — Aneka Ban Cikupa" },
      { name: "description", content: "Katalog ban vulkanisir untuk truk, bus, pickup, dan kendaraan niaga. Harga terjangkau, kualitas terjamin." },
    ],
    links: [{ rel: "canonical", href: "/produk" }],
  }),
  component: ProductsPublic,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Halaman tidak ditemukan.</div>,
});

type Product = {
  id: string;
  product_name: string;
  brand: string | null;
  tire_size: string | null;
  category: string | null;
  price: number;
  stock: number;
  image_urls: string[];
  short_description: string | null;
};

function ProductsPublic() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [size, setSize] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_name, brand, tire_size, category, price, stock, image_urls, short_description")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setItems((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(items.map((i) => i.brand).filter(Boolean))) as string[],
    [items],
  );
  const sizes = useMemo(
    () => Array.from(new Set(items.map((i) => i.tire_size).filter(Boolean))) as string[],
    [items],
  );

  const filtered = items.filter((p) => {
    if (search && !p.product_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (brand !== "all" && p.brand !== brand) return false;
    if (size !== "all" && p.tire_size !== size) return false;
    return true;
  });

  function addToCart(p: Product) {
    const raw = localStorage.getItem("abc_cart");
    const cart: Array<any> = raw ? JSON.parse(raw) : [];
    const existing = cart.find((c) => c.id === p.id);
    if (existing) existing.qty += 1;
    else cart.push({
      id: p.id, qty: 1, product_name: p.product_name, price: p.price,
      image_url: p.image_urls?.[0] ?? null, brand: p.brand, tire_size: p.tire_size, stock: p.stock,
    });
    localStorage.setItem("abc_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart:updated"));
    toast.success(`${p.product_name} ditambahkan ke keranjang`);
  }

  function buyNow(p: Product) {
    addToCart(p);
    navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Katalog Produk</h1>
          <p className="mt-2 text-muted-foreground">Pilih ban vulkanisir berkualitas sesuai kebutuhan kendaraan Anda.</p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-8 grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama produk…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua brand</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger><SelectValue placeholder="Ukuran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua ukuran</SelectItem>
              {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Memuat produk…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Belum ada produk tersedia.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <Card key={p.id} className="group overflow-hidden flex flex-col transition hover:shadow-lg">
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {p.image_urls?.[0] ? (
                    <img
                      src={p.image_urls[0]}
                      alt={p.product_name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  {p.stock <= 0 && (
                    <Badge variant="destructive" className="absolute top-2 left-2">Habis</Badge>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-xs text-muted-foreground">{p.brand ?? "—"}</div>
                  <h3 className="mt-1 font-semibold line-clamp-2">{p.product_name}</h3>
                  {p.tire_size && (
                    <div className="mt-1 text-xs text-muted-foreground">Ukuran: {p.tire_size}</div>
                  )}
                  <div className="mt-3 text-lg font-bold text-primary">
                    Rp {Number(p.price).toLocaleString("id-ID")}
                  </div>
                  <div className="text-xs text-muted-foreground">Stok: {p.stock}</div>
                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 px-2"
                      asChild
                    >
                      <Link to="/produk/$id" params={{ id: p.id }}>
                        <Eye className="h-3.5 w-3.5" /> Detail
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 px-2"
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Cart
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 px-2 bg-accent text-accent-foreground hover:bg-accent/90"
                      disabled={p.stock <= 0}
                      onClick={() => buyNow(p)}
                    >
                      <Zap className="h-3.5 w-3.5" /> Beli
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
