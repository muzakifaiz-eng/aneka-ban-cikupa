import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReviewModal } from "@/components/review-modal";

type Props = ButtonProps & {
  label?: string;
  showIcon?: boolean;
};

export function WriteReviewButton({ label = "Tulis Ulasan", showIcon = true, ...btnProps }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | {
    orderId: string;
    userId: string;
    reviewerName: string | null;
    productId: string | null;
  }>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      // Find a completed order without a review yet
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!orders || orders.length === 0) {
        toast.info("Anda belum memiliki pesanan yang selesai untuk diulas.");
        navigate({ to: "/orders" });
        return;
      }

      const { data: existing } = await supabase
        .from("reviews")
        .select("order_id")
        .eq("user_id", user.id);
      const reviewed = new Set((existing ?? []).map((r) => r.order_id));
      const target = orders.find((o) => !reviewed.has(o.id));

      if (!target) {
        toast.info("Anda sudah mengulas semua pesanan Anda. Terima kasih!");
        navigate({ to: "/my-reviews" });
        return;
      }

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id")
        .eq("order_id", target.id)
        .limit(1);

      setModal({
        orderId: target.id,
        userId: user.id,
        reviewerName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email ??
          null,
        productId: items?.[0]?.product_id ?? null,
      });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat data pesanan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={handleClick} disabled={loading} {...btnProps}>
        {showIcon && <Star className="mr-2 h-4 w-4" />}
        {loading ? "Memuat…" : label}
      </Button>
      {modal && (
        <ReviewModal
          open={!!modal}
          onOpenChange={(o) => { if (!o) setModal(null); }}
          orderId={modal.orderId}
          userId={modal.userId}
          reviewerName={modal.reviewerName}
          productId={modal.productId}
        />
      )}
    </>
  );
}
