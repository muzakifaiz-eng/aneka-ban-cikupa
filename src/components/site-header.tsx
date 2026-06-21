import { useEffect, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Search, ShoppingCart, User as UserIcon, Menu, X,
  LayoutDashboard, Package, Users as UsersIcon, Settings, LogOut,
  ClipboardList, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCartCount } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string };

const DEFAULT_NAV: NavItem[] = [
  { label: "Beranda", href: "/#beranda" },
  { label: "Produk", href: "/#produk" },
  { label: "Tentang", href: "/#tentang" },
  { label: "Kontak", href: "/#kontak" },
];

export function SiteHeader({ nav = DEFAULT_NAV }: { nav?: NavItem[] }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const cartCount = useCartCount();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    await router.invalidate();
    navigate({ to: "/", replace: true });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    if (!q) return;
    navigate({ to: "/", hash: "produk", search: { q } as any });
  }

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Akun";
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined);
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/95 shadow-sm backdrop-blur"
          : "border-b border-white/10 bg-primary-deep/90 backdrop-blur-lg",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: "var(--gradient-accent)" }}
          >
            <span className="font-extrabold text-primary-deep">A</span>
          </div>
          <div className="leading-tight">
            <div className={cn("text-sm font-extrabold tracking-tight", scrolled ? "text-primary" : "text-white")}>
              ANEKA BAN
            </div>
            <div className={cn("text-[10px] uppercase tracking-[0.2em]", scrolled ? "text-muted-foreground" : "text-white/60")}>
              Cikupa
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-6 hidden flex-1 items-center gap-7 lg:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={cn(
                "text-sm font-medium transition hover:text-accent",
                scrolled ? "text-foreground/80" : "text-white/80",
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <IconButton scrolled={scrolled} ariaLabel="Cari" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </IconButton>

          <IconButton
            scrolled={scrolled}
            ariaLabel="Keranjang"
            onClick={() => navigate({ to: "/cart" })}
            badge={cartCount}
          >
            <ShoppingCart className="h-5 w-5" />
          </IconButton>

          {/* Auth area */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "ml-1 hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition sm:flex",
                    scrolled ? "hover:bg-muted" : "hover:bg-white/10",
                  )}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-accent/40">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback className="bg-accent text-primary-deep text-xs font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("max-w-[120px] truncate text-sm font-semibold", scrolled ? "text-foreground" : "text-white")}>
                    {displayName}
                  </span>
                  <ChevronDown className={cn("h-4 w-4", scrolled ? "text-muted-foreground" : "text-white/70")} />
                </button>
              </DropdownMenuTrigger>
              <UserMenuContent
                role={role}
                user={{ displayName, email: user.email ?? "", avatarUrl, initial }}
                onSignOut={handleSignOut}
              />
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className={cn(
                "ml-1 hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition sm:inline-flex",
                scrolled
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-accent text-primary-deep hover:scale-105",
              )}
            >
              <UserIcon className="h-4 w-4" /> Login
            </Link>
          )}

          {/* Mobile profile button — opens sheet */}
          {user ? (
            <button
              className={cn("rounded-full p-1 sm:hidden", scrolled ? "hover:bg-muted" : "hover:bg-white/10")}
              onClick={() => setMobileOpen(true)}
              aria-label="Akun"
            >
              <Avatar className="h-8 w-8 ring-2 ring-accent/40">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-accent text-primary-deep text-xs font-bold">{initial}</AvatarFallback>
              </Avatar>
            </button>
          ) : (
            <IconButton scrolled={scrolled} ariaLabel="Login" onClick={() => navigate({ to: "/login" })} className="sm:hidden">
              <UserIcon className="h-5 w-5" />
            </IconButton>
          )}

          {/* Hamburger */}
          <IconButton
            scrolled={scrolled}
            ariaLabel="Menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </IconButton>
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          {user && (
            <div className="flex items-center gap-3 border-b bg-muted/40 p-4">
              <Avatar className="h-12 w-12 ring-2 ring-accent/40">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-accent text-primary-deep font-bold">{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
                <div className="truncate text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          )}

          <nav className="flex flex-col p-2">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="border-t p-2">
            {user ? (
              <UserMenuList
                role={role}
                onItemClick={() => setMobileOpen(false)}
                onSignOut={handleSignOut}
              />
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                <UserIcon className="h-4 w-4" /> Login dengan Google
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cari Produk</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitSearch} className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nama produk, merek, kategori, ukuran ban..."
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Cari berdasarkan nama produk, brand, kategori, atau ukuran ban.
            </p>
            <Button type="submit" className="w-full">Cari</Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function IconButton({
  scrolled, ariaLabel, onClick, badge, children, className,
}: {
  scrolled: boolean;
  ariaLabel: string;
  onClick?: () => void;
  badge?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-full transition",
        scrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10",
        className,
      )}
    >
      {children}
      {badge && badge > 0 ? (
        <Badge
          className="absolute -right-0.5 -top-0.5 h-5 min-w-5 justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary-deep"
        >
          {badge > 99 ? "99+" : badge}
        </Badge>
      ) : null}
    </button>
  );
}

function UserMenuContent({
  role, user, onSignOut,
}: {
  role: "admin" | "customer" | null;
  user: { displayName: string; email: string; avatarUrl?: string; initial: string };
  onSignOut: () => void;
}) {
  return (
    <DropdownMenuContent
      align="end"
      sideOffset={8}
      className="w-72 overflow-hidden rounded-2xl border-border p-0 shadow-xl"
    >
      <div className="flex items-center gap-3 bg-gradient-to-br from-primary to-primary-glow p-4 text-primary-foreground">
        <Avatar className="h-12 w-12 ring-2 ring-accent/60">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
          <AvatarFallback className="bg-accent text-primary-deep font-bold">{user.initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{user.displayName}</div>
          <div className="truncate text-xs text-primary-foreground/80">{user.email}</div>
        </div>
      </div>
      <DropdownMenuLabel className="px-4 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        {role === "admin" ? "Admin" : "Akun Saya"}
      </DropdownMenuLabel>
      <div className="p-2">
        <UserMenuList role={role} onSignOut={onSignOut} variant="dropdown" />
      </div>
    </DropdownMenuContent>
  );
}

const customerItems = [
  { to: "/dashboard", label: "My Profile", icon: UserIcon },
  { to: "/orders", label: "My Orders", icon: ClipboardList },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/dashboard", label: "Settings", icon: Settings },
];

const adminItems = [
  { to: "/admin", label: "Dashboard Admin", icon: LayoutDashboard },
  { to: "/admin/products", label: "Product Management", icon: Package },
  { to: "/admin/orders", label: "Orders Management", icon: ShoppingCart },
  { to: "/admin/customers", label: "Customers", icon: UsersIcon },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function UserMenuList({
  role, onSignOut, onItemClick, variant = "sheet",
}: {
  role: "admin" | "customer" | null;
  onSignOut: () => void;
  onItemClick?: () => void;
  variant?: "dropdown" | "sheet";
}) {
  const items = role === "admin" ? adminItems : customerItems;

  if (variant === "dropdown") {
    return (
      <>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <DropdownMenuItem key={it.label} asChild className="cursor-pointer rounded-lg px-3 py-2.5">
              <Link to={it.to as any}>
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" /> {it.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          className="cursor-pointer rounded-lg px-3 py-2.5 text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.label}
            to={it.to as any}
            onClick={onItemClick}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Icon className="h-4 w-4 text-muted-foreground" /> {it.label}
          </Link>
        );
      })}
      <button
        onClick={onSignOut}
        className="mt-1 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}
