import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { CheckCircle2, Circle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetail,
  head: () => ({ meta: [{ title: "Detail Pesanan — Aneka Ban Cikupa" }] }),
});

type Order = {
  id: string;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  recipient_name: string | null;
  whatsapp: string | null;
  address: string | null;
};
type Item = {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image_url: string | null;
};

const STAGES = ["pending", "processing", "ready", "completed"] as const;
const stageLabel: Record<string, string> = {
  pending: "Pending", processing: "Processing", ready: "Ready",
  shipped: "Shipped", completed: "Completed", cancelled: "Cancelled",
};

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: its }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      setOrder(o as Order | null);
      setItems((its as Item[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  function reorder() {
    items.forEach((it) => {
      if (!it.product_id) return;
      addItem({
        id: it.product_id, product_name: it.product_name, price: Number(it.unit_price),
        image_url: it.image_url,
      }, it.quantity);
    });
    toast.success("Produk ditambahkan ke keranjang");
    navigate({ to: "/cart" });
  }

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="pt-32 text-center text-muted-foreground">Memuat…</div></div>;
  if (!order) return <div className="min-h-screen bg-background"><SiteHeader /><div className="pt-32 text-center">Pesanan tidak ditemukan.</div></div>;

  const currentStageIdx = order.status === "cancelled" ? -1 : STAGES.indexOf(order.status as any);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16 md:px-6">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali ke daftar pesanan
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Pesanan #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString("id-ID")}</p>
          </div>
          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>
            {stageLabel[order.status] ?? order.status}
          </Badge>
        </div>

        {/* Tracker */}
        {order.status !== "cancelled" && (
          <Card className="mt-6 p-6">
            <h2 className="font-bold mb-4">Status Pesanan</h2>
            <ol className="flex flex-wrap gap-4">
              {STAGES.map((s, i) => {
                const done = i <= currentStageIdx;
                return (
                  <li key={s} className="flex items-center gap-2 text-sm">
                    {done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    <span className={done ? "font-semibold" : "text-muted-foreground"}>{stageLabel[s]}</span>
                    {i < STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-6">
            <h2 className="font-bold mb-4">Item Pesanan</h2>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 border-b pb-3 last:border-b-0">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.image_url && <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-1">{it.product_name}</div>
                    <div className="text-xs text-muted-foreground">{it.quantity} × Rp {Number(it.unit_price).toLocaleString("id-ID")}</div>
                  </div>
                  <div className="font-semibold">Rp {Number(it.subtotal).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4 flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-extrabold text-primary">Rp {Number(order.total).toLocaleString("id-ID")}</span>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="font-bold mb-3">Pengiriman</h2>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-muted-foreground">Penerima</dt><dd className="font-medium">{order.recipient_name ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">WhatsApp</dt><dd className="font-medium">{order.whatsapp ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Alamat</dt><dd className="font-medium whitespace-pre-line">{order.address ?? "—"}</dd></div>
                {order.notes && <div><dt className="text-muted-foreground">Catatan</dt><dd className="font-medium">{order.notes}</dd></div>}
              </dl>
            </Card>

            <Button onClick={reorder} className="w-full">Reorder</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
