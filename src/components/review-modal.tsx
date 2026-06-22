import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  userId: string;
  reviewerName?: string | null;
  productId?: string | null;
  onSubmitted?: () => void;
};

export function ReviewModal({ open, onOpenChange, orderId, userId, reviewerName, productId, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setRating(0); setHover(0); setTitle(""); setMessage(""); setPhoto(null); setPhotoPreview(null);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Foto maksimal 5MB"); return; }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (rating < 1) return toast.error("Pilih rating bintang");
    if (!title.trim()) return toast.error("Judul ulasan tidak boleh kosong");
    if (!message.trim()) return toast.error("Pesan ulasan tidak boleh kosong");
    if (title.length > 120) return toast.error("Judul maksimal 120 karakter");
    if (message.length > 1000) return toast.error("Pesan maksimal 1000 karakter");

    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${userId}/${orderId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("review-photos").upload(path, photo, { upsert: false });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("review-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
        photo_url = signed?.signedUrl ?? null;
      }

      const { error } = await supabase.from("reviews").insert({
        order_id: orderId,
        user_id: userId,
        product_id: productId ?? null,
        rating,
        title: title.trim(),
        message: message.trim(),
        photo_url,
        reviewer_name: reviewerName ?? null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("Anda sudah memberi ulasan untuk pesanan ini");
        } else {
          throw error;
        }
      } else {
        toast.success("Terima kasih! Ulasan Anda menunggu persetujuan admin.");
        reset();
        onOpenChange(false);
        onSubmitted?.();
      }
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengirim ulasan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tulis Ulasan</DialogTitle>
          <DialogDescription>
            Bagikan pengalaman Anda. Ulasan bersifat opsional dan akan ditinjau sebelum tampil di website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} bintang`}
                >
                  <Star className={cn("h-8 w-8 transition-colors", (hover || rating) >= n ? "fill-accent text-accent" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="review-title">Judul Ulasan</Label>
            <Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Misal: Pelayanan ramah dan ban berkualitas" />
          </div>

          <div>
            <Label htmlFor="review-message">Pesan</Label>
            <Textarea id="review-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={4} placeholder="Ceritakan pengalaman Anda…" />
            <div className="mt-1 text-xs text-muted-foreground text-right">{message.length}/1000</div>
          </div>

          <div>
            <Label className="mb-2 block">Foto (opsional)</Label>
            {photoPreview ? (
              <div className="relative inline-block">
                <img src={photoPreview} alt="preview" className="h-24 w-24 rounded-md object-cover border" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted">
                <Upload className="h-4 w-4" />
                Unggah foto
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={submitting}>
            Nanti Saja
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Mengirim…" : "Kirim Ulasan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
