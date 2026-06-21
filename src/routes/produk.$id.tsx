import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, Zap, MessageCircle, ChevronLeft, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

const WA_NUMBER = "6281234567890";

export const Route = createFileRoute("/produk/$id")({
  component: ProductDetail,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-center">Produk tidak ditemukan.</div>,
});

type Product = {
  id: string;
  product_name: string;
  brand: string | null;
  tire_size: string | null;
  category: string | null;
  price: number;
  stock: number;
  image_urls: string[] | null;
  description: string | null;
  short_description: string | null;
  weight: number | null;
  warranty: string | null;
};

function ProductDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, product_name, brand, tire_size, category, price, stock, image_urls, description, short_description, weight, warranty")
        .eq("id", id)
        .maybeSingle();
      if (error) toast.error(error.message);
      setP(data as Product | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background"><SiteHeader /><div className="pt-32 text-center text-muted-foreground">Memuat…</div></div>
  );
  if (!p) return (
    <div className="min-h-screen bg-background"><SiteHeader /><div className="pt-32 text-center">Produk tidak ditemukan.</div></div>
  );

  const images = p.image_urls?.length ? p.image_urls : [];
  const inStock = p.stock > 0;

  function add() {
    if (!p) return;
    addItem({
      id: p.id, product_name: p.product_name, price: Number(p.price),
      image_url: images[0] ?? null, brand: p.brand, tire_size: p.tire_size, stock: p.stock,
    }, qty);
    toast.success(`${p.product_name} ditambahkan ke keranjang`);
  }

  function buy() {
    add();
    navigate({ to: "/checkout" });
  }

  const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Halo Aneka Ban Cikupa, saya ingin konsultasi tentang produk ${p.product_name}${p.tire_size ? ` (${p.tire_size})` : ""}.`,
  )}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pt-24 pb-16 md:px-6">
        <Link to="/produk" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Kembali ke katalog
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <Card className="aspect-square overflow-hidden bg-muted">
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={p.product_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-16 w-16" />
                </div>
              )}
            </Card>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`aspect-square overflow-hidden rounded-md border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={u} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="text-sm text-muted-foreground">{p.brand ?? "—"}</div>
            <h1 className="mt-1 text-3xl font-bold">{p.product_name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.category && <Badge variant="secondary">{p.category}</Badge>}
              {p.tire_size && <Badge variant="outline">Ukuran {p.tire_size}</Badge>}
              {!inStock && <Badge variant="destructive">Habis</Badge>}
            </div>

            <div className="mt-6 text-3xl font-extrabold text-primary">
              Rp {Number(p.price).toLocaleString("id-ID")}
            </div>
            <div className="text-sm text-muted-foreground">Stok: {p.stock}</div>

            {p.short_description && (
              <p className="mt-4 text-muted-foreground">{p.short_description}</p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="inline-flex items-center rounded-md border">
                <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span className="px-4 text-sm font-semibold">{qty}</span>
                <button className="px-3 py-2" onClick={() => setQty((q) => Math.min(p.stock || 99, q + 1))}>+</button>
              </div>
              <span className="text-xs text-muted-foreground">Maks {p.stock}</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button size="lg" variant="outline" disabled={!inStock} onClick={add} className="gap-2">
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Button size="lg" disabled={!inStock} onClick={buy} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Zap className="h-4 w-4" /> Buy Now
              </Button>
            </div>
            <a href={waLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4" /> Konsultasi via WhatsApp
            </a>

            {/* Specs */}
            <div className="mt-8">
              <h2 className="text-lg font-bold">Spesifikasi</h2>
              <dl className="mt-3 divide-y rounded-lg border text-sm">
                {[
                  ["Brand", p.brand],
                  ["Kategori", p.category],
                  ["Ukuran Ban", p.tire_size],
                  ["Berat", p.weight ? `${p.weight} kg` : null],
                  ["Garansi", p.warranty],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="grid grid-cols-3 gap-2 px-4 py-2.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="col-span-2 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {p.description && (
              <div className="mt-8">
                <h2 className="text-lg font-bold">Deskripsi</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
