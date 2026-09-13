import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  UserCircle,
  Users,
  Wallet,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useOnline } from "@/hooks/use-online";
import { useCashSession } from "@/hooks/use-cash-session";
import { formatXAF } from "@/lib/format";
import { canAccess, ROLE_LABELS, type Role } from "@/lib/rbac";
import { usePointOfSale } from "@/hooks/use-point-of-sale";
import { PosSelector } from "@/components/pos-selector";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  minRole?: Role;
};

const groups: { title: string; minRole?: Role; items: NavItem[] }[] = [
  {
    title: "Vente",
    items: [
      { to: "/",         label: "Tableau de bord", icon: LayoutGrid },
      { to: "/pos",      label: "Point de vente",  icon: ShoppingCart },
      { to: "/ventes",   label: "Ventes",          icon: Receipt },
      { to: "/devis",    label: "Devis",           icon: FileText },
      { to: "/factures", label: "Factures B2B",    icon: FileText,  minRole: "gerant" },
      { to: "/caisse",   label: "Caisse",          icon: Wallet },
    ],
  },
  {
    title: "Stock",
    items: [
      { to: "/catalogue",   label: "Catalogue",   icon: Package },
      { to: "/stock",       label: "Stock",       icon: Boxes,       minRole: "gerant" },
      { to: "/fournisseurs",label: "Fournisseurs",icon: Truck,       minRole: "gerant" },
      { to: "/transferts",  label: "Transferts",  icon: Truck,       minRole: "gerant" },
      { to: "/promotions",  label: "Promotions",  icon: BadgePercent,minRole: "gerant" },
    ],
  },
  {
    title: "Électronique",
    items: [
      { to: "/electronique/fiches",      label: "Fiches techniques", icon: Smartphone },
      { to: "/electronique/imei",        label: "IMEI / séries",     icon: Smartphone },
      { to: "/electronique/garanties",   label: "Garanties",         icon: ShieldCheck },
      { to: "/electronique/sav",         label: "SAV",               icon: Wrench },
      { to: "/electronique/echeanciers", label: "Échéanciers",       icon: CreditCard },
    ],
  },
  {
    title: "Pilotage",
    items: [
      { to: "/clients",    label: "Clients",     icon: Users },
      { to: "/rapports",   label: "Rapports",    icon: BarChart3, minRole: "gerant" },
      { to: "/parametres", label: "Paramètres",  icon: Settings,  minRole: "gerant" },
    ],
  },
  {
    title: "Compte",
    items: [
      { to: "/profil", label: "Mon profil", icon: UserCircle },
    ],
  },
  {
    title: "Administration",
    minRole: "proprietaire",
    items: [
      { to: "/admin/utilisateurs", label: "Utilisateurs",  icon: Users,    minRole: "proprietaire" },
      { to: "/admin/roles",        label: "Rôles",         icon: ShieldCheck, minRole: "proprietaire" },
      { to: "/admin/facturation",  label: "Facturation",   icon: FileText, minRole: "proprietaire" },
    ],
  },
];

const bottomTabsAll: NavItem[] = [
  { to: "/",      label: "Accueil", icon: LayoutGrid },
  { to: "/pos",   label: "POS",     icon: ShoppingCart },
  { to: "/stock", label: "Stock",   icon: Boxes,  minRole: "gerant" },
];

function NavLinks({ role, onNavigate }: { role: Role | undefined; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleGroups = groups
    .filter((g) => !g.minRole || canAccess(role, g.items[0]?.to ?? "/__noaccess"))
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => canAccess(role, item.to)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {visibleGroups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {group.title}
          </p>
          {group.items.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors duration-150",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const online = useOnline();
  const { user, logout, refreshUser } = useAuth();
  const { session } = useCashSession();
  const { pos, openSelector } = usePointOfSale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const role = user?.role as Role | undefined;
  const bottomTabs = bottomTabsAll.filter((t) => canAccess(role, t.to));

  // The cached user (localStorage, set at login) never updates on its own —
  // refresh it once so a stale must_change_password from an earlier session
  // doesn't linger after the password was already changed elsewhere.
  const refreshedOnce = useRef(false);
  useEffect(() => {
    if (refreshedOnce.current) return;
    refreshedOnce.current = true;
    void refreshUser();
  }, [refreshUser]);

  // A password never rotated off its initial value blocks every other
  // endpoint on the API — send the member straight to the page that can
  // fix it instead of letting them hit a wall of failed requests.
  useEffect(() => {
    if (user?.must_change_password && pathname !== "/profil") {
      void navigate({ to: "/profil" });
    }
  }, [user?.must_change_password, pathname, navigate]);

  return (
    <div className="min-h-screen w-full bg-background">
      <PosSelector />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
            <ShoppingCart className="size-4" aria-hidden />
          </div>
          <span className="text-[17px] font-semibold tracking-tight">BSS POS</span>
        </div>
        <NavLinks role={role} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-sidebar shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
              <span className="text-[17px] font-semibold tracking-tight">BSS POS</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer le menu"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </Button>
            </div>
            <NavLinks role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ouvrir le menu"
            className="min-h-[44px] min-w-[44px] lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
          <div className="hidden lg:block" />
          <div className="flex min-w-0 items-center gap-2 flex-wrap">
            {session ? (
              <Badge className="gap-1.5 border-transparent bg-success/15 text-[11px] font-semibold tracking-wider text-foreground uppercase">
                Caisse ouverte · {session.cash_register} · {formatXAF(session.opening_balance)}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[11px] font-semibold tracking-wider uppercase"
              >
                Aucune session caisse
              </Badge>
            )}
            <button
              type="button"
              onClick={openSelector}
              className="flex items-center gap-1.5 rounded-[8px] border border-border bg-card px-2.5 py-1 text-[12px] font-medium text-foreground transition-colors duration-150 hover:bg-accent cursor-pointer"
              title="Changer de boutique"
            >
              <Building2 className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="max-w-[120px] truncate">
                {pos?.name ?? "Boutique…"}
              </span>
              <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="grid min-h-[44px] min-w-[44px] place-items-center"
              title={online ? "En ligne" : "Hors-ligne"}
            >
              {online ? (
                <Wifi className="size-[18px] text-success" aria-label="En ligne" />
              ) : (
                <WifiOff className="size-[18px] text-warning" aria-label="Hors-ligne" />
              )}
            </span>
            <Link
              to="/profil"
              className="hidden rounded-[8px] px-1.5 py-1 text-right transition-colors duration-150 hover:bg-muted sm:block"
            >
              <p className="text-[13px] leading-tight font-medium">{user?.name ?? "Utilisateur"}</p>
              <p className="text-[11px] tracking-wider text-muted-foreground uppercase">
                {role ? ROLE_LABELS[role] : "Vendeur"}
              </p>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => {
                logout();
                window.location.assign("/connexion");
              }}
            >
              <LogOut className="size-[18px]" aria-hidden />
            </Button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] pb-24 md:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
        {bottomTabs.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <tab.icon className="size-5" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" aria-hidden />
          Menu
        </button>
      </nav>
    </div>
  );
}
