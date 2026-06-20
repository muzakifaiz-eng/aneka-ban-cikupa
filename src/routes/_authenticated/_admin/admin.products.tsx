import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil, Trash2, Plus, Search, Eye, Copy, ArrowUpDown,
  X, Upload, MoveLeft, MoveRight, ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  tire_size: string | null;
  price: number;
  stock: number;
  weight: number | null;
  warranty: string | null;
  short_description: string | null;
  description: string | null;
  status: string;
  image_urls: string[];
  created_at: string;
};

type FormState = Omit<Product, "id" | "created_at">;

const emptyForm: FormState = {
  product_name: "",
  brand: "",
  category: "",
  tire_size: "",
  price: 0,
  stock: 0,
  weight: null,
  warranty: "",
  short_description: "",
  description: "",
  status: "active",
  image_urls: [],
};

const PAGE_SIZE = 10;
const BUCKET = "product-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

type SortKey = "price" | "stock" | "created_at";
type SortDir = "asc" | "desc";

function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Product[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const brands = useMemo(
    () => Array.from(new Set(items.map((i) => i.brand).filter(Boolean))) as string[],
    [items],
  );
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[],
    [items],
  );
  const sizes = useMemo(
    () => Array.from(new Set(items.map((i) => i.tire_size).filter(Boolean))) as string[],
    [items],
  );

  const filtered = useMemo(() => {
    let list = items.filter((p) => {
      if (search && !p.product_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (brandFilter !== "all" && p.brand !== brandFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (sizeFilter !== "all" && p.tire_size !== sizeFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number | string;
      const bv = (b[sortKey] ?? 0) as number | string;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, search, brandFilter, categoryFilter, sizeFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      product_name: p.product_name,
      brand: p.brand ?? "",
      category: p.category ?? "",
      tire_size: p.tire_size ?? "",
      price: p.price,
      stock: p.stock,
      weight: p.weight,
      warranty: p.warranty ?? "",
      short_description: p.short_description ?? "",
      description: p.description ?? "",
      status: p.status,
      image_urls: p.image_urls ?? [],
    });
    setOpen(true);
  }

  function openDuplicate(p: Product) {
    setEditing(null);
    setForm({
      product_name: `${p.product_name} (copy)`,
      brand: p.brand ?? "",
      category: p.category ?? "",
      tire_size: p.tire_size ?? "",
      price: p.price,
      stock: p.stock,
      weight: p.weight,
      warranty: p.warranty ?? "",
      short_description: p.short_description ?? "",
      description: p.description ?? "",
      status: p.status,
      image_urls: [...(p.image_urls ?? [])],
    });
    setOpen(true);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { data: signed, error: signErr } = await supabase
        .storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      if (signErr || !signed?.signedUrl) {
        toast.error("Failed to create image URL");
        continue;
      }
      newUrls.push(signed.signedUrl);
    }
    setForm((f) => ({ ...f, image_urls: [...f.image_urls, ...newUrls] }));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }));
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...f.image_urls];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return f;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...f, image_urls: arr };
    });
  }

  async function handleSave() {
    if (!form.product_name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSaving(true);
    const payload = {
      product_name: form.product_name.trim(),
      brand: form.brand || null,
      category: form.category || null,
      tire_size: form.tire_size || null,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      weight: form.weight !== null && form.weight !== undefined && !isNaN(Number(form.weight))
        ? Number(form.weight) : null,
      warranty: form.warranty || null,
      short_description: form.short_description || null,
      description: form.description || null,
      status: form.status,
      image_urls: form.image_urls,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Product updated" : "Product added");
    setOpen(false);
    load();
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.product_name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your tire catalog, stock, and pricing.</p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-full">
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger><SelectValue placeholder="Tire size" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Tire size</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("price")}>
                    Price <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("stock")}>
                    Stock <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("created_at")}>
                    Created <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-10">No products found.</TableCell></TableRow>
              ) : (
                pageItems.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.image_urls?.[0] ? (
                        <img src={p.image_urls[0]} alt={p.product_name} className="h-10 w-10 rounded object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.product_name}</div>
                      {p.short_description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.short_description}</div>
                      )}
                    </TableCell>
                    <TableCell>{p.brand ?? "—"}</TableCell>
                    <TableCell>{p.tire_size ?? "—"}</TableCell>
                    <TableCell>{p.category ?? "—"}</TableCell>
                    <TableCell className="text-right">Rp {Number(p.price).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">{p.stock}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="View" onClick={() => setViewing(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Duplicate" onClick={() => openDuplicate(p)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Delete" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""} · page {page} / {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.product_name}</DialogTitle>
                <DialogDescription>{viewing.brand} · {viewing.tire_size}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {viewing.image_urls?.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {viewing.image_urls.map((u, i) => (
                      <img key={i} src={u} alt="" className="aspect-square w-full rounded object-cover border" />
                    ))}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Price" value={`Rp ${Number(viewing.price).toLocaleString("id-ID")}`} />
                  <Detail label="Stock" value={String(viewing.stock)} />
                  <Detail label="Category" value={viewing.category ?? "—"} />
                  <Detail label="Weight" value={viewing.weight ? `${viewing.weight} kg` : "—"} />
                  <Detail label="Warranty" value={viewing.warranty ?? "—"} />
                  <Detail label="Status" value={viewing.status} />
                </div>
                {viewing.short_description && (
                  <p className="text-sm text-muted-foreground">{viewing.short_description}</p>
                )}
                {viewing.description && (
                  <p className="text-sm whitespace-pre-line">{viewing.description}</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>Fill in product details and upload images.</DialogDescription>
          </DialogHeader>

          {/* Images */}
          <div className="space-y-2">
            <Label>Product images</Label>
            <div className="flex flex-wrap gap-3">
              {form.image_urls.map((url, idx) => (
                <div key={idx} className="relative group h-24 w-24 rounded border overflow-hidden">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveImage(idx, -1)} className="p-1 text-white hover:bg-white/20 rounded" title="Move left">
                        <MoveLeft className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => moveImage(idx, 1)} className="p-1 text-white hover:bg-white/20 rounded" title="Move right">
                        <MoveRight className="h-3 w-3" />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeImage(idx)} className="p-1 text-white hover:bg-destructive/80 rounded" title="Remove">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1 rounded">Main</span>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 w-24 rounded border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" required>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            </Field>
            <Field label="Brand">
              <Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Category">
              <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Truck, Bus, Pickup…" />
            </Field>
            <Field label="Tire size">
              <Input value={form.tire_size ?? ""} onChange={(e) => setForm({ ...form, tire_size: e.target.value })} placeholder="1000-20, 750-16…" />
            </Field>
            <Field label="Price (Rp)">
              <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </Field>
            <Field label="Stock">
              <Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" min="0" step="0.1" value={form.weight ?? ""} onChange={(e) => setForm({ ...form, weight: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Warranty">
              <Input value={form.warranty ?? ""} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="6 bulan…" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Short description">
            <Input value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
          </Field>
          <Field label="Full description">
            <Textarea rows={5} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading}>{saving ? "Saving…" : "Save product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
