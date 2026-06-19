import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  component: DashboardOverview,
});

type Stats = {
  products: number;
  orders: number;
  customers: number;
  revenue: number;
};

function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, customers: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<Array<{ id: string; total: number; status: string; created_at: string }>>([]);

  useEffect(() => {
    (async () => {
      const [p, o, c, oList] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (o.data ?? []).reduce((sum, r) => sum + Number(r.total ?? 0), 0);
      setStats({
        products: p.count ?? 0,
        orders: o.count ?? 0,
        customers: c.count ?? 0,
        revenue,
      });
      setRecent((oList.data as typeof recent) ?? []);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Products", value: stats.products, icon: Package },
    { label: "Orders", value: stats.orders, icon: ShoppingCart },
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Revenue", value: `Rp ${stats.revenue.toLocaleString("id-ID")}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your store.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "…" : c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((o) => (
                <li key={o.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                  <span>{o.status}</span>
                  <span className="font-medium">Rp {Number(o.total).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
