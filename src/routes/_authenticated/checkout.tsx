import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/checkout")({
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — Aneka Ban Cikupa" }] }),
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", whatsapp: "", address: "", notes: "" });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    if (!form.recipient_name.trim() || !form.whatsapp.trim() || !form.address.trim()) {
      toast.error("Lengkapi data pengiriman");
      return;
    }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error("Silakan login terlebih dahulu");
        navigate({ to: "/login" });
        return;
      }
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: u.user.id,
          total: subtotal,
          status: "pending",
          notes: form.notes || null,
          recipient_name: form.recipient_name,
          whatsapp: form.whatsapp,
          address: form.address,
        })
        .select("id")
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Gagal membuat order");

      const rows = items.map((it) => ({
        order_id: order.id,
        product_id: it.id,
        product_name: it.product_name,
        unit_price: Number(it.price),
        quantity: it.qty,
        subtotal: Number(it.price) * it.qty,
        image_url: it.image_url ?? null,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;

      clear();
      toast.success("Pesanan berhasil dibuat!");
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal membuat order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 md:px-6">
        <h1 className="text-3xl font-bold">Checkout</h1>

        {items.length === 0 ? (
          <Card className="mt-8 p-12 text-center">
            <p className="text-muted-foreground">Keranjang Anda kosong.</p>
            <Button asChild className="mt-4"><Link to="/produk">Mulai Belanja</Link></Button>
          </Card>
        ) : (
          <form onSubmit={placeOrder} className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-6 space-y-4">
              <h2 className="font-bold text-lg">Informasi Pengiriman</h2>
              <div>
                <Label htmlFor="rn">Nama Penerima</Label>
                <Input id="rn" required value={form.recipient_name} onChange={(e) => update("recipient_name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="wa">Nomor WhatsApp</Label>
                <Input id="wa" required type="tel" placeholder="08xxxxxxxxxx" value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="addr">Alamat Pengiriman</Label>
                <Textarea id="addr" required rows={3} value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="nt">Catatan Pesanan (opsional)</Label>
                <Textarea id="nt" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
              </div>
            </Card>

            <Card className="p-6 h-fit lg:sticky lg:top-24 space-y-3">
              <h2 className="font-bold text-lg">Ringkasan Pesanan</h2>
              <div className="space-y-2 max-h-64 overflow-auto">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm gap-2">
                    <span className="line-clamp-1">{it.product_name} × {it.qty}</span>
                    <span className="font-medium shrink-0">Rp {(it.price * it.qty).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between text-base">
                <span className="font-bold">Total</span>
                <span className="font-extrabold text-primary">Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Memproses…" : "Place Order"}
              </Button>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
}
