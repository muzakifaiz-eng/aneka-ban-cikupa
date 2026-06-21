import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, ShoppingBag, ImageIcon, Minus, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Keranjang — Aneka Ban Cikupa" }] }),
});

function CartPage() {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, subtotal } = useCart();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 md:px-6">
        <h1 className="text-3xl font-bold">Keranjang Belanja</h1>
        <p className="text-sm text-muted-foreground mt-1">{items.length} produk di keranjang Anda.</p>

        {items.length === 0 ? (
          <Card className="mt-8 p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Keranjang Anda masih kosong.</p>
            <Button asChild className="mt-6"><Link to="/produk">Mulai Belanja</Link></Button>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {items.map((it) => (
                <Card key={it.id} className="flex items-center gap-4 p-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to="/produk/$id" params={{ id: it.id }} className="font-semibold hover:text-primary line-clamp-1">{it.product_name}</Link>
                    <div className="text-xs text-muted-foreground">{it.brand ?? ""} {it.tire_size ? `• ${it.tire_size}` : ""}</div>
                    <div className="mt-1 text-sm font-bold text-primary">Rp {Number(it.price).toLocaleString("id-ID")}</div>
                  </div>
                  <div className="flex items-center rounded-md border">
                    <button className="px-2 py-1" onClick={() => updateQty(it.id, it.qty - 1)}><Minus className="h-3 w-3" /></button>
                    <span className="px-3 text-sm font-semibold">{it.qty}</span>
                    <button className="px-2 py-1" onClick={() => updateQty(it.id, it.qty + 1)}><Plus className="h-3 w-3" /></button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>

            <Card className="p-6 h-fit sticky top-24">
              <h2 className="font-bold text-lg">Ringkasan</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkir</span>
                <span className="text-muted-foreground">Dihitung saat checkout</span>
              </div>
              <div className="mt-4 border-t pt-4 flex justify-between text-base">
                <span className="font-bold">Total</span>
                <span className="font-extrabold text-primary">Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <Button className="w-full mt-6" size="lg" onClick={() => navigate({ to: "/checkout" })}>
                Lanjut ke Checkout
              </Button>
              <Button asChild variant="outline" className="w-full mt-2"><Link to="/produk">Lanjut Belanja</Link></Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
