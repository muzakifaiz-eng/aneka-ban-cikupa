import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronLeft } from "lucide-react";
import { WriteReviewButton } from "@/components/write-review-button";

export const Route = createFileRoute("/my-reviews")({
  component: MyReviews,
  head: () => ({
    meta: [
      { title: "Ulasan Saya — Aneka Ban Cikupa" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Review = {
  id: string;
  order_id: string;
  rating: number;
  title: string;
  message: string;
  status: string;
  created_at: string;
};

function MyReviews() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Review[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/login" });
        return;
      }
      setAuthed(true);
      const { data } = await supabase
        .from("reviews")
        .select("id,order_id,rating,title,message,status,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      setList((data as Review[]) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16 md:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Ulasan Saya</h1>
            <p className="text-sm text-muted-foreground">Semua ulasan yang pernah Anda kirim.</p>
          </div>
          {list.length > 0 && <WriteReviewButton label="Tulis Ulasan" />}
        </div>

        {loading ? (
          <Card className="mt-8 p-8 text-center text-muted-foreground">Memuat…</Card>
        ) : list.length === 0 ? (
          <Card className="mt-8 flex flex-col items-center gap-4 p-10 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Belum ada ulasan.</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Bagikan pengalaman Anda setelah pesanan selesai.
              </p>
            </div>
            <WriteReviewButton label="Tulis Ulasan" />
          </Card>
        ) : (
          <div className="mt-6 grid gap-4">
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
                      <Badge
                        variant={
                          r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"
                        }
                      >
                        {r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending"}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-bold">{r.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{r.message}</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Order #{r.order_id.slice(0, 8).toUpperCase()} · {new Date(r.created_at).toLocaleString("id-ID")}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
