import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getPostLoginPath } from "@/lib/post-login";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => ({
    meta: [{ title: "Masuk - Aneka Ban Cikupa" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const path = await getPostLoginPath(data.user.id);
        navigate({ to: path, replace: true });
      }
    });
  }, [navigate]);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? "Gagal masuk. Coba lagi.");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    const path = data.user ? await getPostLoginPath(data.user.id) : "/";
    navigate({ to: path, replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Masuk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Masuk untuk melanjutkan ke Aneka Ban Cikupa.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          onClick={handleGoogle}
          disabled={loading}
          className="mt-6 w-full"
          size="lg"
        >
          {loading ? "Menghubungkan..." : "Lanjutkan dengan Google"}
        </Button>
      </div>
    </main>
  );
}
