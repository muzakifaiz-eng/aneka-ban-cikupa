import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [{ title: "Dashboard - Aneka Ban Cikupa" }],
  }),
});

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      setEmail(user.email ?? null);

      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
      } else {
        // Fallback: ensure profile row exists (trigger should have created it)
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            full_name:
              (user.user_metadata?.full_name as string) ??
              (user.user_metadata?.name as string) ??
              null,
            avatar_url:
              (user.user_metadata?.avatar_url as string) ??
              (user.user_metadata?.picture as string) ??
              null,
          })
          .select("id, email, full_name, avatar_url")
          .single();
        if (inserted) setProfile(inserted as Profile);
      }
    })();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-4">
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-14 w-14 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Selamat datang{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile?.email ?? email ?? ""}
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            Ke beranda
          </Button>
          <Button onClick={handleSignOut}>Keluar</Button>
        </div>
      </div>
    </main>
  );
}
