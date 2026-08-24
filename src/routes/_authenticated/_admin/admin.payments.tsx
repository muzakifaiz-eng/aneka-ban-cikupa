import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, ExternalLink, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { paymentStatusMeta, rupiah, type PaymentStatus } from "@/lib/payment";

export const Route = createFileRoute("/_authenticated/_admin/admin/payments")({
  component: AdminPayments,
});

type Row = {
  id: string;
  order_id: string;
  bank: string | null;
  amount: number;
  sender_name: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  paid_at: string | null;
  verified_at: string | null;
  created_at: string;
  orders: { recipient_name: string | null; whatsapp: string | null; status: string; total: number } | null;
};

const FILTERS: { key: "all" | PaymentStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "awaiting_verification", label: "Menunggu Verifikasi" },
  { key: "awaiting_payment", label: "Menunggu Pembayaran" },
  { key: "verified", label: "Terverifikasi" },
  { key: "rejected", label: "Ditolak" },
];

function AdminPayments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [q, setQ] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select("*, orders(recipient_name, whatsapp, status, total)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    waiting: rows.filter((r) => r.status === "awaiting_verification").length,
    verified: rows.filter((r) => r.status === "verified").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    total: rows.filter((r) => r.status === "verified").reduce((s, r) => s + Number(r.amount), 0),
  }), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.order_id.toLowerCase().includes(term) ||
        (r.sender_name ?? "").toLowerCase().includes(term) ||
        (r.orders?.recipient_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, filter, q]);

  async function verify(r: Row) {
    setBusy(true);
    const { error } = await supabase
      .from("payments")
      .update({ status: "verified", verified_at: new Date().toISOString(), rejection_reason: null })
      .eq("id", r.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pembayaran diverifikasi, pesanan masuk tahap Processing");
    load();
  }

  async function reject() {
    if (!rejectTarget) return;
    if (!reason.trim()) return toast.error("Isi alasan penolakan");
    setBusy(true);
    const { error } = await supabase
      .from("payments")
      .update({ status: "rejected", rejection_reason: reason.trim() })
      .eq("id", rejectTarget.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pembayaran ditolak");
    setRejectTarget(null);
    setReason("");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Pembayaran</h1>
        <p className="text-sm text-muted-foreground">Verifikasi bukti transfer pelanggan.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Menunggu Verifikasi", value: stats.waiting },
          { label: "Terverifikasi", value: stats.verified },
          { label: "Ditolak", value: stats.rejected },
          { label: "Total Diterima", value: rupiah(stats.total) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Input
          placeholder="Cari order / nama pengirim…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-full sm:w-64"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Bank / Pengirim</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada data pembayaran.</TableCell></TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">#{r.order_id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.orders?.recipient_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.orders?.whatsapp ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.bank ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.sender_name ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-right">{rupiah(r.amount)}</TableCell>
                    <TableCell>
                      {r.proof_url ? (
                        <a href={r.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">
                          Lihat <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0", paymentStatusMeta[r.status].className)}>
                        {paymentStatusMeta[r.status].label}
                      </Badge>
                      {r.status === "rejected" && r.rejection_reason && (
                        <div className="mt-1 max-w-[180px] text-xs text-muted-foreground">{r.rejection_reason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {r.status !== "verified" && (
                          <Button size="sm" disabled={busy} onClick={() => verify(r)} className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verifikasi
                          </Button>
                        )}
                        {r.status !== "rejected" && r.status !== "verified" && (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => { setRejectTarget(r); setReason(""); }} className="gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Tolak
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Tolak Pembayaran</DialogTitle>
            <DialogDescription>
              Pelanggan akan melihat alasan ini dan dapat mengunggah ulang bukti transfer.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reason">Alasan Penolakan</Label>
            <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Nominal transfer tidak sesuai." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={reject} disabled={busy}>Tolak Pembayaran</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
