import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Copy, Upload, X, CheckCircle2, ChevronLeft, Landmark, AlertTriangle, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { waLink, waMessages } from "@/lib/whatsapp";
import {
  BANK_ACCOUNTS, paymentStatusMeta, rupiah,
  type BankKey, type PaymentStatus,
} from "@/lib/payment";

export const Route = createFileRoute("/_authenticated/payment/$id")({
  component: PaymentPage,
  head: () => ({
    meta: [
      { title: "Pembayaran Pesanan — Aneka Ban Cikupa" },
      { name: "description", content: "Pilih rekening dan kirim bukti pembayaran pesanan Aneka Ban Cikupa." },
      { property: "og:title", content: "Pembayaran Pesanan — Aneka Ban Cikupa" },
      { property: "og:description", content: "Pilih rekening dan kirim bukti pembayaran pesanan Aneka Ban Cikupa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Payment = {
  id: string;
  order_id: string;
  user_id: string;
  bank: string | null;
  account_number: string | null;
  amount: number;
  sender_name: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  paid_at: string | null;
  verified_at: string | null;
};

function PaymentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [bank, setBank] = useState<BankKey>("BCA");
  const [sender, setSender] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("orders").select("id, total").eq("id", id).maybeSingle(),
      supabase.from("payments").select("*").eq("order_id", id).maybeSingle(),
    ]);
    setOrderTotal(Number((o as any)?.total ?? 0));
    const pay = p as Payment | null;
    setPayment(pay);
    if (pay?.bank === "BCA" || pay?.bank === "BSI") setBank(pay.bank);
    if (pay?.sender_name) setSender(pay.sender_name);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Bukti transfer maksimal 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!payment || !userId) return;
    if (!sender.trim()) return toast.error("Isi nama pengirim transfer");
    if (!file && !payment.proof_url) return toast.error("Unggah bukti transfer terlebih dahulu");

    setSubmitting(true);
    try {
      let proof_url = payment.proof_url;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${payment.order_id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        proof_url = signed?.signedUrl ?? null;
      }

      const acc = BANK_ACCOUNTS.find((b) => b.key === bank);
      if (!acc) throw new Error("Rekening pembayaran tidak ditemukan");
      const { error } = await supabase
        .from("payments")
        .update({
          bank: acc.key,
          account_number: acc.account_number,
          account_holder: acc.account_holder,
          sender_name: sender.trim(),
          proof_url,
          status: "awaiting_verification",
          paid_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", payment.id);
      if (error) throw error;

      toast.success("Bukti pembayaran terkirim. Menunggu verifikasi admin.");
      setFile(null);
      setPreview(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mengirim bukti pembayaran");
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Nomor rekening disalin");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="pt-32 text-center text-muted-foreground">Memuat…</div>
      </div>
    );
  }
  if (!payment) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="pt-32 text-center space-y-4">
          <p>Data pembayaran tidak ditemukan.</p>
          <Button asChild variant="outline"><Link to="/orders">Ke Pesanan Saya</Link></Button>
        </div>
      </div>
    );
  }

  const amount = Number(payment.amount || orderTotal);
  const meta = paymentStatusMeta[payment.status];
  const orderCode = `#${payment.order_id.slice(0, 8).toUpperCase()}`;
  const canUpload = payment.status === "awaiting_payment" || payment.status === "rejected" || payment.status === "awaiting_verification";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pt-24 pb-16 md:px-6 animate-fade-in">
        <Link
          to="/orders/$id"
          params={{ id: payment.order_id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Kembali ke detail pesanan
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pembayaran</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Pesanan {orderCode}</h1>
          </div>
          <Badge className={cn("border-0 px-3 py-1.5 text-sm", meta.className)}>{meta.label}</Badge>
        </div>

        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Total yang harus dibayar</span>
            <span className="text-2xl font-extrabold text-primary">{rupiah(amount)}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{meta.message}</p>
          {payment.status === "rejected" && payment.rejection_reason && (
            <div className="mt-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <div className="font-semibold text-destructive">Alasan penolakan</div>
                <p className="text-foreground/80">{payment.rejection_reason}</p>
              </div>
            </div>
          )}
        </Card>

        {payment.status === "verified" ? (
          <Card className="mt-6 p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
              <div>
                <h2 className="font-bold text-lg">Pembayaran Terverifikasi</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Terverifikasi pada{" "}
                  {payment.verified_at
                    ? new Date(payment.verified_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
                    : "-"}
                  . Pesanan Anda sedang kami proses.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/orders/$id" params={{ id: payment.order_id }}>Lacak Pesanan</Link>
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card className="mt-6 p-6">
              <h2 className="font-bold text-lg">1. Pilih Metode Pembayaran</h2>
              <p className="mt-1 text-sm text-muted-foreground">Transfer manual ke salah satu rekening berikut.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {BANK_ACCOUNTS.map((b) => {
                  const active = bank === b.key;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setBank(b.key)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-primary" />
                        <span className="font-bold">{b.name}</span>
                        {active && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                      </div>
                      <div className="mt-2 font-mono text-lg font-semibold tracking-wide">{b.account_number}</div>
                      <div className="text-xs text-muted-foreground">a.n. {b.account_holder}</div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); copy(b.account_number); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); copy(b.account_number); } }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Copy className="h-3 w-3" /> Salin Nomor Rekening
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Transfer tepat sejumlah <span className="font-semibold text-foreground">{rupiah(amount)}</span> agar
                verifikasi lebih cepat. Simpan bukti transfer Anda.
              </div>
            </Card>

            <Card className="mt-6 p-6">
              <h2 className="font-bold text-lg">2. Unggah Bukti Transfer</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="sender">Nama Pengirim</Label>
                  <Input
                    id="sender"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="Nama pemilik rekening pengirim"
                  />
                </div>

                <div>
                  <Label>Bukti Transfer (JPG/PNG, maks 5MB)</Label>
                  {preview ? (
                    <div className="relative mt-2 w-48 overflow-hidden rounded-lg border">
                      <img src={preview} alt="Pratinjau bukti transfer" className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                        aria-label="Hapus bukti"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 flex h-32 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/50">
                      <Upload className="h-4 w-4" /> Pilih file bukti transfer
                      <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
                    </label>
                  )}
                  {!preview && payment.proof_url && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Bukti sebelumnya sudah terunggah.{" "}
                      <a href={payment.proof_url} target="_blank" rel="noreferrer" className="text-primary underline">
                        Lihat bukti
                      </a>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={submit} disabled={submitting || !canUpload} size="lg">
                    {submitting ? "Mengirim…" : payment.status === "awaiting_verification" ? "Perbarui Bukti Transfer" : "Kirim Bukti Pembayaran"}
                  </Button>
                  <Button asChild variant="outline" className="gap-2">
                    <a href={waLink(waMessages.order(orderCode))} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> Hubungi Admin
                    </a>
                  </Button>
                  <Button variant="ghost" onClick={() => navigate({ to: "/orders" })}>
                    Bayar Nanti
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
