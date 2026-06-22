import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/reviews")({
  component: AdminReviews,
  head: () => ({ meta: [{ title: "Reviews — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type Review = {
  id: string; order_id: string; rating: number; title: string; message: string;
  photo_url: string | null; status: string; reviewer_name: string | null; created_at: string;
};

function AdminReviews() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setList((data as Review[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function setStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("reviews").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Ulasan ${status === "approved" ? "disetujui" : "ditolak"}`);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus ulasan ini?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ulasan dihapus");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground">Tinjau dan kelola ulasan pelanggan.</p>
        </div>
        <div className="flex gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "pending" ? "Pending" : f === "approved" ? "Approved" : f === "rejected" ? "Rejected" : "All"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Memuat…</Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Tidak ada ulasan.</Card>
      ) : (
        <div className="grid gap-4">
          {list.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                      {r.status}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-bold">{r.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{r.message}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {r.reviewer_name ?? "Pelanggan"} · Order #{r.order_id.slice(0, 8).toUpperCase()} · {new Date(r.created_at).toLocaleString("id-ID")}
                  </div>
                  {r.photo_url && (
                    <img src={r.photo_url} alt="" className="mt-3 h-24 w-24 rounded-md object-cover border" />
                  )}
                </div>
                <div className="flex gap-2">
                  {r.status !== "approved" && (
                    <Button size="sm" onClick={() => setStatus(r.id, "approved")} className="gap-1">
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")} className="gap-1">
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="gap-1 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
