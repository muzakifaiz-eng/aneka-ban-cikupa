import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Package } from "lucide-react";
import type { PaymentStatus } from "@/lib/payment";

export const Route = createFileRoute("/_authenticated/orders/")({
  component: MyOrders,
  head: () => ({
    meta: [
      { title: "Pesanan Saya — Aneka Ban Cikupa" },
      { name: "description", content: "Lihat status pesanan dan pembayaran Anda di Aneka Ban Cikupa." },
      { property: "og:title", content: "Pesanan Saya — Aneka Ban Cikupa" },
      { property: "og:description", content: "Lihat status pesanan dan pembayaran Anda di Aneka Ban Cikupa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

type OrderPayment = {
  order_id: string;
  status: PaymentStatus;
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Record<string, PaymentStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .order("created_at", { ascending: false });
      const nextOrders = (data as Order[]) ?? [];
      setOrders(nextOrders);

      if (nextOrders.length > 0) {
        const { data: paymentRows } = await supabase
          .from("payments")
          .select("order_id, status")
          .in("order_id", nextOrders.map((order) => order.id));
        setPayments(
          Object.fromEntries(
            ((paymentRows as OrderPayment[]) ?? []).map((payment) => [payment.order_id, payment.status]),
          ),
        );
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16 md:px-6">
        <h1 className="text-3xl font-bold">Pesanan Saya</h1>
        <p className="text-sm text-muted-foreground mt-1">Daftar semua pesanan Anda.</p>

        {loading ? (
          <p className="mt-8 text-center text-muted-foreground">Memuat…</p>
        ) : orders.length === 0 ? (
          <Card className="mt-8 p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Belum ada pesanan.</p>
            <Button asChild className="mt-6"><Link to="/produk">Mulai Belanja</Link></Button>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => {
              const paymentStatus = payments[o.id] ?? "awaiting_payment";
              const canPay = paymentStatus === "awaiting_payment" || paymentStatus === "rejected";
              return (
              <Card key={o.id} className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</div>
                  <div className="mt-1 text-sm">{new Date(o.created_at).toLocaleString("id-ID")}</div>
                </div>
                <div className="sm:text-right">
                  <Badge variant="secondary">{statusLabel[o.status] ?? o.status}</Badge>
                  <div className="mt-1 font-bold text-primary">Rp {Number(o.total).toLocaleString("id-ID")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {paymentStatus === "awaiting_verification" && "Menunggu Verifikasi"}
                    {paymentStatus === "verified" && "Sudah Dibayar"}
                    {paymentStatus === "rejected" && "Pembayaran Ditolak"}
                    {paymentStatus === "awaiting_payment" && "Belum Dibayar"}
                    {paymentStatus === "expired" && "Pembayaran Kedaluwarsa"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPay && (
                    <Button asChild size="sm" className="gap-2">
                      <Link to="/payment/$id" params={{ id: o.id }}>
                        <CreditCard className="h-4 w-4" /> Bayar Sekarang
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/orders/$id" params={{ id: o.id }}>Detail</Link>
                  </Button>
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
