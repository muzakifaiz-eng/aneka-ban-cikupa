import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { useEffect, useState } from "react";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/orders")({
  component: OrdersPage,
});

type OrderStatus = "pending" | "processing" | "ready" | "shipped" | "completed" | "cancelled";

type Order = {
  id: string;
  user_id: string;
  total: number;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  recipient_name: string | null;
  whatsapp: string | null;
  address: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

const statuses: OrderStatus[] = ["pending", "processing", "ready", "completed", "cancelled"];

const statusVariant: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary", processing: "default", ready: "default",
  shipped: "default", completed: "outline", cancelled: "destructive",
};

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, OrderItem[]>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("id, user_id, total, status, notes, created_at, recipient_name, whatsapp, address")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleExpand(orderId: string) {
    if (expanded === orderId) { setExpanded(null); return; }
    setExpanded(orderId);
    if (!itemsCache[orderId]) {
      const { data } = await supabase
        .from("order_items")
        .select("id, product_name, quantity, unit_price, subtotal")
        .eq("order_id", orderId);
      setItemsCache((c) => ({ ...c, [orderId]: (data as OrderItem[]) ?? [] }));
    }
  }

  async function updateStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Status diperbarui");
  }

  async function handleDelete(o: Order) {
    if (!confirm(`Hapus pesanan ${o.id.slice(0, 8)}?`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    setOrders((prev) => prev.filter((x) => x.id !== o.id));
    toast.success("Pesanan dihapus");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">Kelola dan lacak pesanan pelanggan.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Order</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada pesanan.</TableCell></TableRow>
              ) : (
                orders.map((o) => (
                  <Fragment key={o.id}>
                    <TableRow>
                      <TableCell>
                        <button onClick={() => toggleExpand(o.id)} className="p-1">
                          {expanded === o.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{o.recipient_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.whatsapp ?? ""}</div>
                      </TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="text-right">Rp {Number(o.total).toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                          <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(o)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === o.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="grid gap-4 md:grid-cols-2 p-2">
                            <div>
                              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Item</h4>
                              <div className="space-y-1 text-sm">
                                {(itemsCache[o.id] ?? []).map((it) => (
                                  <div key={it.id} className="flex justify-between">
                                    <span>{it.product_name} × {it.quantity}</span>
                                    <span className="font-medium">Rp {Number(it.subtotal).toLocaleString("id-ID")}</span>
                                  </div>
                                ))}
                                {!itemsCache[o.id]?.length && <span className="text-muted-foreground">Memuat…</span>}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Pengiriman</h4>
                              <div className="text-sm space-y-1">
                                <div><span className="text-muted-foreground">Alamat: </span>{o.address ?? "—"}</div>
                                {o.notes && <div><span className="text-muted-foreground">Catatan: </span>{o.notes}</div>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
