import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin - Aneka Ban Cikupa" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
};

function AdminPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });
      setProfiles((data as ProfileRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Halaman ini hanya dapat diakses oleh admin.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Keluar
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Pengguna</h2>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <ul className="mt-4 divide-y">
              {profiles.map((p) => (
                <li key={p.id} className="py-3 text-sm">
                  <span className="font-medium text-foreground">
                    {p.full_name ?? "Tanpa nama"}
                  </span>
                  <span className="ml-2 text-muted-foreground">{p.email}</span>
                </li>
              ))}
              {profiles.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">
                  Belum ada data.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
