import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import {
  CheckCircle2,
  ChevronLeft,
  Star,
  Clock,
  Loader2,
  PackageCheck,
  PartyPopper,
  XCircle,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Ban,
  User,
  Phone,
  StickyNote,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { ReviewModal } from "@/components/review-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetail,
  head: () => ({ meta: [{ title: "Detail Pesanan — Aneka Ban Cikupa" }] }),
});

type OrderStatus = "pending" | "processing" | "ready" | "shipped" | "completed" | "cancelled";

type Order = {
  id: string;
  total: number;
  status: OrderStatus;
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
  brand?: string | null;
  tire_size?: string | null;
};
type HistoryEntry = { id: string; status: OrderStatus; created_at: string };

const STAGES: OrderStatus[] = ["pending", "processing", "ready", "completed"];

const stageMeta: Record<OrderStatus, {
  label: string;
  icon: any;
  color: string;
  ring: string;
  message: string;
}> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "bg-yellow-500 text-white",
    ring: "ring-yellow-500/30",
    message: "Pesanan Anda telah kami terima dan sedang menunggu konfirmasi.",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    color: "bg-blue-500 text-white",
    ring: "ring-blue-500/30",
    message: "Pesanan Anda sedang kami siapkan.",
  },
  ready: {
    label: "Ready",
    icon: PackageCheck,
    color: "bg-emerald-500 text-white",
    ring: "ring-emerald-500/30",
    message: "Pesanan Anda siap untuk diambil atau dikirim.",
  },
  shipped: {
    label: "Shipped",
    icon: PackageCheck,
    color: "bg-emerald-500 text-white",
    ring: "ring-emerald-500/30",
    message: "Pesanan Anda sedang dalam pengiriman.",
  },
  completed: {
    label: "Complete",
    icon: PartyPopper,
    color: "bg-green-600 text-white",
    ring: "ring-green-600/30",
    message: "Terima kasih telah berbelanja di Aneka Ban Cikupa.",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "bg-destructive text-white",
    ring: "ring-destructive/30",
    message:
      "Mohon maaf, kami tidak dapat memenuhi pesanan Anda. Hal ini mungkin disebabkan oleh ketersediaan stok atau kendala operasional. Kami mohon maaf atas ketidaknyamanannya. Silakan hubungi kami untuk informasi lebih lanjut.",
  },
};

const ADMIN_WA = "6281234567890"; // ganti ke nomor admin resmi
const STORE_MAP_URL = "https://maps.google.com/?q=Aneka+Ban+Cikupa";

function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [hasReview, setHasReview] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function loadReview(uid: string) {
    const { data } = await supabase.from("reviews").select("id").eq("order_id", id).eq("user_id", uid).maybeSingle();
    setHasReview(!!data);
  }

  async function loadAll() {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    setUserId(uid);
    setUserName(u.user?.user_metadata?.full_name ?? u.user?.user_metadata?.name ?? u.user?.email ?? null);

    const [{ data: o }, { data: its }, { data: hist }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id),
      supabase
        .from("order_status_history")
        .select("id, status, created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
    ]);

    setOrder(o as Order | null);
    const rawItems = (its as Item[]) ?? [];

    // Enrich items with brand + tire_size from products
    const productIds = rawItems.map((i) => i.product_id).filter(Boolean) as string[];
    if (productIds.length > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, brand, tire_size")
        .in("id", productIds);
      const map = new Map((prods ?? []).map((p: any) => [p.id, p]));
      setItems(rawItems.map((it) => ({
        ...it,
        brand: it.product_id ? map.get(it.product_id)?.brand ?? null : null,
        tire_size: it.product_id ? map.get(it.product_id)?.tire_size ?? null : null,
      })));
    } else {
      setItems(rawItems);
    }

    setHistory((hist as HistoryEntry[]) ?? []);
    if (uid) await loadReview(uid);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function cancelOrder() {
    if (!order) return;
    if (!confirm("Batalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setCancelling(true);
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    setCancelling(false);
    if (error) return toast.error(error.message);
    toast.success("Pesanan dibatalkan");
    loadAll();
  }

  const currentStageIdx = useMemo(() => {
    if (!order) return -1;
    if (order.status === "cancelled") return -1;
    if (order.status === "shipped") return STAGES.indexOf("ready");
    return STAGES.indexOf(order.status);
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="pt-32 text-center text-muted-foreground">Memuat…</div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="pt-32 text-center">Pesanan tidak ditemukan.</div>
      </div>
    );
  }

  const meta = stageMeta[order.status];
  const StatusIcon = meta.icon;
  const isCancelled = order.status === "cancelled";
  const orderCode = `#${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 md:px-6 animate-fade-in">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Kembali ke daftar pesanan
        </Link>

        {/* Header */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Detail Pesanan</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1">{orderCode}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dibuat pada {new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
          <Badge className={cn("gap-1.5 px-3 py-1.5 text-sm border-0", meta.color)}>
            <StatusIcon className={cn("h-4 w-4", order.status === "processing" && "animate-spin")} />
            {meta.label}
          </Badge>
        </div>

        {/* Progress Tracker or Cancelled Banner */}
        {isCancelled ? (
          <Card className="mt-6 p-6 border-destructive/30 bg-destructive/5 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-destructive/10 p-3 shrink-0">
                <Ban className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-destructive">Pesanan Dibatalkan</h2>
                <p className="mt-1 text-sm text-foreground/80">{meta.message}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="mt-6 p-6 md:p-8 animate-scale-in overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-primary" />
            <h2 className="font-bold text-lg">Status Pesanan</h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.message}</p>

            {/* Horizontal tracker */}
            <div className="mt-8">
              <div className="relative flex items-center justify-between">
                {/* connecting line */}
                <div className="absolute left-5 right-5 top-5 h-1 bg-muted rounded-full -z-0" />
                <div
                  className="absolute left-5 top-5 h-1 bg-gradient-to-r from-primary to-orange-500 rounded-full -z-0 transition-all duration-700"
                  style={{
                    width: currentStageIdx <= 0 ? "0%" : `calc(${(currentStageIdx / (STAGES.length - 1)) * 100}% - ${(currentStageIdx / (STAGES.length - 1)) * 40}px)`,
                  }}
                />
                {STAGES.map((s, i) => {
                  const done = i <= currentStageIdx;
                  const active = i === currentStageIdx;
                  const m = stageMeta[s];
                  const Icon = m.icon;
                  return (
                    <div key={s} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full grid place-items-center transition-all duration-300 ring-4",
                          done ? m.color : "bg-muted text-muted-foreground ring-transparent",
                          active && `${m.ring} shadow-lg scale-110`,
                        )}
                      >
                        {done ? (
                          <Icon className={cn("h-5 w-5", active && s === "processing" && "animate-spin")} />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <span className={cn("text-xs md:text-sm font-medium text-center", done ? "text-foreground" : "text-muted-foreground")}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === "pending" && (
            <Button variant="destructive" onClick={cancelOrder} disabled={cancelling} className="gap-2">
              <Ban className="h-4 w-4" /> {cancelling ? "Membatalkan…" : "Batalkan Pesanan"}
            </Button>
          )}
          {(order.status === "processing" || order.status === "ready") && (
            <Button asChild className="gap-2">
              <a href={waLink(ADMIN_WA, `Halo, saya ingin bertanya mengenai pesanan ${orderCode}`)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> Hubungi Admin
              </a>
            </Button>
          )}
          {order.status === "ready" && (
            <Button asChild variant="outline" className="gap-2">
              <a href={STORE_MAP_URL} target="_blank" rel="noreferrer">
                <MapPin className="h-4 w-4" /> Lihat Lokasi Toko
              </a>
            </Button>
          )}
          {order.status === "completed" && (
            <>
              {!hasReview && userId && (
                <Button onClick={() => setReviewOpen(true)} variant="outline" className="gap-2">
                  <Star className="h-4 w-4" /> Tulis Ulasan
                </Button>
              )}
              <Button onClick={reorder} className="gap-2">
                <ShoppingBag className="h-4 w-4" /> Beli Lagi
              </Button>
            </>
          )}
          {isCancelled && (
            <Button asChild className="gap-2 bg-green-600 hover:bg-green-700">
              <a href={waLink(ADMIN_WA, `Halo, saya ingin bertanya mengenai pesanan ${orderCode} yang dibatalkan.`)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> Hubungi Admin via WhatsApp
              </a>
            </Button>
          )}
        </div>

        {/* Body grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Left: Items + Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-4">Produk Pesanan</h2>
              <div className="space-y-4">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col sm:flex-row gap-4 rounded-lg border bg-card/50 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted border">
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <ShoppingBag className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-2">{it.product_name}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {it.brand && <Badge variant="secondary" className="font-normal">{it.brand}</Badge>}
                        {it.tire_size && <Badge variant="outline" className="font-normal">{it.tire_size}</Badge>}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {it.quantity} × Rp {Number(it.unit_price).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-xs text-muted-foreground">Subtotal</div>
                      <div className="font-bold text-primary">
                        Rp {Number(it.subtotal).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t pt-4 flex items-center justify-between">
                <span className="font-bold">Total Pembayaran</span>
                <span className="text-xl font-extrabold text-primary">
                  Rp {Number(order.total).toLocaleString("id-ID")}
                </span>
              </div>
            </Card>

            {/* Activity Timeline */}
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-4">Aktivitas Pesanan</h2>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
              ) : (
                <ol className="relative border-l-2 border-muted ml-3 space-y-6">
                  {history.map((h, i) => {
                    const m = stageMeta[h.status] ?? stageMeta.pending;
                    const Icon = m.icon;
                    const latest = i === history.length - 1;
                    return (
                      <li key={h.id} className="ml-6">
                        <span
                          className={cn(
                            "absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-background",
                            m.color,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-semibold">{m.label}</span>
                          {latest && (
                            <Badge variant="outline" className="text-[10px] font-normal">Terbaru</Badge>
                          )}
                        </div>
                        <time className="block text-xs text-muted-foreground mt-0.5">
                          {new Date(h.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
                        </time>
                        <p className="mt-1 text-sm text-muted-foreground">{m.message}</p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>

          {/* Right: Customer info */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-4">Informasi Pelanggan</h2>
              <dl className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Nama Penerima</dt>
                    <dd className="font-medium">{order.recipient_name ?? "—"}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">WhatsApp</dt>
                    <dd className="font-medium">
                      {order.whatsapp ? (
                        <a
                          className="hover:text-primary transition-colors"
                          href={waLink(order.whatsapp, `Halo`)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {order.whatsapp}
                        </a>
                      ) : "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Alamat Pengiriman</dt>
                    <dd className="font-medium whitespace-pre-line">{order.address ?? "—"}</dd>
                  </div>
                </div>
                {order.notes && (
                  <div className="flex gap-3">
                    <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Catatan Pesanan</dt>
                      <dd className="font-medium whitespace-pre-line">{order.notes}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </Card>

            {order.status === "completed" && hasReview && (
              <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Terima kasih, ulasan Anda telah dikirim.
              </Card>
            )}
          </div>
        </div>
      </main>

      {userId && (
        <ReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          orderId={order.id}
          userId={userId}
          reviewerName={userName}
          productId={items[0]?.product_id ?? null}
          onSubmitted={() => loadReview(userId)}
        />
      )}
    </div>
  );
}
