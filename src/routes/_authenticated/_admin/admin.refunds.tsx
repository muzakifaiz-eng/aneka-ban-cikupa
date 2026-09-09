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
import { Banknote, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BANK_ACCOUNTS, refundStatusMeta, rupiah, type RefundStatus } from "@/lib/payment";

export const Route = createFileRoute("/_authenticated/_admin/admin/refunds")({
  component: AdminRefunds,
  head: () => ({
    meta: [
      { title: "Refund - Admin Aneka Ban Cikupa" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Row = {
  id: string;
  order_id: string;
  payment_id: string | null;
  user_id: string;
  amount: number;
  bank: string | null;
  account_number: string | null;
  account_holder: string | null;
  status: RefundStatus;
  proof_url: string | null;
  admin_note: string | null;
  refunded_at: string | null;
  created_at: string;
  orders: { recipient_name: string | null; whatsapp: string | null; total: number; status: string } | null;
  payments: { amount: number; bank: string | null } | null;
};

type Profile = { id: string; full_name: string | null; email: string | null };

const FILTERS: { key: "all" | RefundStatus; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "processing", label: "Diproses" },
  { key: "refunded", label: "Selesai" },
];

const BANK_OPTIONS = [...BANK_ACCOUNTS.map((b) => b.name), "Bank Lain"];

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function AdminRefunds() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | RefundStatus>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const [procTarget, setProcTarget] = useState<Row | null>(null);
  const [form, setForm] = useState({ bank: "BCA", account_number: "", account_holder: "", amount: "", note: "" });

  const [doneTarget, setDoneTarget] = useState<Row | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("refunds")
      .select("*, orders(recipient_name, whatsapp, total, status), payments(amount, bank)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data as unknown as Row[]) ?? [];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map: Record<string, Profile> = {};
      (p ?? []).forEach((x) => { map[x.id] = x as Profile; });
      setProfiles(map);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    processing: rows.filter((r) => r.status === "processing").length,
    refunded: rows.filter((r) => r.status === "refunded").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!term) return true;
      const p = profiles[r.user_id];
      return (
        r.order_id.toLowerCase().includes(term) ||
        (r.orders?.recipient_name ?? "").toLowerCase().includes(term) ||
        (p?.full_name ?? "").toLowerCase().includes(term) ||
        (p?.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, filter, q, profiles]);

  function openProcess(r: Row) {
    setForm({
      bank: r.bank ?? "BCA",
      account_number: r.account_number ?? "",
      account_holder: r.account_holder ?? r.orders?.recipient_name ?? "",
      amount: String(r.amount ?? r.payments?.amount ?? ""),
      note: r.admin_note ?? "",
    });
    setProcTarget(r);
  }

  async function submitProcess() {
    if (!procTarget) return;
    if (!form.bank.trim() || !form.account_number.trim() || !form.account_holder.trim()) {
      return toast.error("Lengkapi bank, nomor rekening, dan nama pemilik rekening");
    }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error("Jumlah refund tidak valid");
    setBusy(true);
    const { error } = await supabase
      .from("refunds")
      .update({
        status: "processing",
        bank: form.bank.trim(),
        account_number: form.account_number.trim(),
        account_holder: form.account_holder.trim(),
        amount: amt,
        admin_note: form.note.trim() || null,
      })
      .eq("id", procTarget.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Refund ditandai sebagai diproses");
    setProcTarget(null);
    load();
  }

  async function submitDone() {
    if (!doneTarget) return;
    if (!confirmed) return toast.error("Konfirmasi dulu bahwa dana sudah ditransfer");
    setBusy(true);
    let proof_url = doneTarget.proof_url;
    if (proofFile) {
      const ext = proofFile.name.split(".").pop() ?? "jpg";
      const path = `refunds/${doneTarget.order_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { upsert: true });
      if (upErr) { setBusy(false); return toast.error(upErr.message); }
      proof_url = path;
    }
    const { error } = await supabase
      .from("refunds")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), proof_url })
      .eq("id", doneTarget.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Refund selesai");
    setDoneTarget(null);
    setProofFile(null);
    setConfirmed(false);
    load();
  }

  async function openProof(path: string) {
    if (/^https?:\/\//.test(path)) return window.open(path, "_blank");
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (error || !data) return toast.error("Bukti refund tidak dapat dibuka");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Refund</h1>
        <p className="text-sm text-muted-foreground">Kelola pengembalian dana pesanan yang dibatalkan.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Semua Refund", value: stats.all },
          { label: "Menunggu Refund", value: stats.pending },
          { label: "Refund Diproses", value: stats.processing },
          { label: "Refund Selesai", value: stats.refunded },
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
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
        <Input
          placeholder="Cari order / nama / email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-full sm:w-64"
        />
      </div>

      {loading ? (
        <Card><CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data refund…
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <RotateCcw className="mx-auto mb-2 h-6 w-6" />
          Belum ada data refund.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => {
            const p = profiles[r.user_id];
            const meta = refundStatusMeta[r.status];
            return (
              <Card key={r.id}>
                <CardContent className="p-4 md:p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">
                        Order #{r.order_id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="font-semibold">{p?.full_name ?? r.orders?.recipient_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p?.email ?? r.orders?.whatsapp ?? ""}</div>
                    </div>
                    <Badge className={cn("border-0", meta.className)}>{meta.label}</Badge>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Pembayaran Awal" value={rupiah(r.payments?.amount ?? r.orders?.total ?? 0)} />
                    <Field label="Metode Awal" value={r.payments?.bank ?? "—"} />
                    <Field label="Jumlah Refund" value={rupiah(r.amount)} />
                    <Field label="Dibuat" value={fmtDate(r.created_at)} />
                    <Field label="Bank Refund" value={r.bank ?? "—"} />
                    <Field label="Nama Rekening" value={r.account_holder ?? "—"} />
                    <Field label="Nomor Rekening" value={r.account_number ?? "—"} />
                    <Field label="Selesai" value={fmtDate(r.refunded_at)} />
                  </div>

                  {r.admin_note && (
                    <div className="rounded-md bg-muted/50 p-3 text-xs">
                      <span className="font-medium">Catatan admin: </span>{r.admin_note}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {r.status === "pending" && (
                      <Button size="sm" onClick={() => openProcess(r)} className="gap-1">
                        <Banknote className="h-3.5 w-3.5" /> Proses Refund
                      </Button>
                    )}
                    {r.status === "processing" && (
                      <>
                        <span className="text-sm text-muted-foreground">Refund Diproses</span>
                        <Button size="sm" onClick={() => { setDoneTarget(r); setProofFile(null); setConfirmed(false); }} className="gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Refund Selesai
                        </Button>
                      </>
                    )}
                    {r.status === "refunded" && (
                      <>
                        <span className="text-sm font-medium text-green-600">Refund Selesai</span>
                        {r.proof_url && (
                          <Button size="sm" variant="outline" onClick={() => openProof(r.proof_url!)}>
                            Lihat Bukti Transfer
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proses refund */}
      <Dialog open={!!procTarget} onOpenChange={(o) => !o && setProcTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Proses Refund</DialogTitle>
            <DialogDescription>
              Simpan data rekening tujuan refund. Status akan berubah menjadi “Refund Diproses”.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Bank Tujuan Refund</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {BANK_OPTIONS.map((b) => (
                  <Button
                    key={b}
                    type="button"
                    size="sm"
                    variant={form.bank === b ? "default" : "outline"}
                    onClick={() => setForm((f) => ({ ...f, bank: b }))}
                  >
                    {b}
                  </Button>
                ))}
              </div>
              {form.bank === "Bank Lain" && (
                <Input
                  className="mt-2"
                  placeholder="Nama bank"
                  onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                />
              )}
            </div>
            <div>
              <Label htmlFor="acc">Nomor Rekening Tujuan</Label>
              <Input id="acc" value={form.account_number} onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="holder">Nama Pemilik Rekening</Label>
              <Input id="holder" value={form.account_holder} onChange={(e) => setForm((f) => ({ ...f, account_holder: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="amt">Jumlah Refund</Label>
              <Input id="amt" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="note">Catatan Refund</Label>
              <Textarea id="note" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcTarget(null)}>Batal</Button>
            <Button onClick={submitProcess} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Simpan &amp; Proses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selesaikan refund */}
      <Dialog open={!!doneTarget} onOpenChange={(o) => !o && setDoneTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Konfirmasi Refund Selesai</DialogTitle>
            <DialogDescription>
              Pastikan dana sebesar {doneTarget ? rupiah(doneTarget.amount) : ""} sudah benar-benar ditransfer ke
              {" "}{doneTarget?.bank ?? "-"} {doneTarget?.account_number ?? ""} ({doneTarget?.account_holder ?? "-"}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>Saya konfirmasi dana refund sudah ditransfer secara manual.</span>
            </label>
            <div>
              <Label htmlFor="proof">Bukti Transfer Refund (opsional)</Label>
              <Input id="proof" type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneTarget(null)}>Batal</Button>
            <Button onClick={submitDone} disabled={busy || !confirmed}>
              {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Tandai Refund Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
