import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Receipt, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/lib/api";
import { formatXAF, formatTime } from "@/lib/format";
import { useCashSession } from "@/hooks/use-cash-session";
import type { BackendStockLevel } from "@/lib/types";

export const Route = createFileRoute("/_auth/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — BSS POS" },
      {
        name: "description",
        content:
          "Chiffre d'affaires du jour, ventes récentes et alertes de stock de votre boutique d'électronique.",
      },
      { property: "og:title", content: "Tableau de bord — BSS POS" },
      {
        property: "og:description",
        content: "Pilotez vos ventes d'appareils électroniques en temps réel.",
      },
    ],
  }),
  component: DashboardPage,
});

interface BackendDashboard {
  total_sale_count: number;
  total_excluding_tax: number;
  total_tax: number;
  total_including_tax: number;
  is_provisional: boolean;
  by_pos: Array<{ point_of_sale_id: string; name: string; total: number; count: number }>;
}

interface BackendSaleItem {
  id: string;
  number: string;
  state: string;
  total_including_tax: number;
  created_at: string;
  customer?: { id: string; name: string } | null;
}

function DashboardPage() {
  const { session } = useCashSession();
  const today = new Date().toISOString().slice(0, 10);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard-today", today],
    queryFn: () =>
      request<BackendDashboard>(`/commerce/dashboard?from=${today}&to=${today}`)
        .catch(() => null),
    staleTime: 30_000,
  });

  const { data: recentSales = [] } = useQuery({
    queryKey: ["dashboard-recent-sales"],
    queryFn: () =>
      request<{ data: BackendSaleItem[] }>("/commerce/sales?state=confirmed&per_page=5")
        .then((r) => r.data)
        .catch(() => []),
    staleTime: 30_000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: () =>
      request<{ data: BackendStockLevel[] }>("/commerce/stock/alerts")
        .then((r) => r.data)
        .catch(() => []),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const avgBasket =
    dashboard && dashboard.total_sale_count > 0
      ? Math.trunc(dashboard.total_including_tax / dashboard.total_sale_count)
      : 0;

  return (
    <PageBody>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la boutique aujourd'hui."
        action={
          session ? (
            <Badge className="min-h-[32px] border-transparent bg-success/15 px-3 text-[12px] font-semibold text-foreground">
              Session caisse active
            </Badge>
          ) : (
            <Button asChild className="min-h-[44px] rounded-[10px] px-5 font-medium">
              <Link to="/pos/ouvrir">
                <ShoppingCart className="size-4" aria-hidden />
                Ouvrir le POS
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[124px] rounded-[16px]" />
          ))
        ) : (
          <>
            <KpiCard
              label="CA du jour"
              value={formatXAF(dashboard?.total_including_tax ?? 0)}
              hint={dashboard?.is_provisional ? "Données provisoires" : "Encaissements confirmés"}
              icon={TrendingUp}
            />
            <KpiCard
              label="Ventes"
              value={String(dashboard?.total_sale_count ?? 0)}
              hint="Tickets du jour"
              icon={Receipt}
            />
            <KpiCard
              label="Panier moyen"
              value={formatXAF(avgBasket)}
              hint="Par ticket"
              icon={ShoppingCart}
            />
            <KpiCard
              label="TVA collectée"
              value={formatXAF(dashboard?.total_tax ?? 0)}
              hint="Sur les ventes du jour"
              icon={Users}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <h2 className="text-[17px] font-semibold">Dernières ventes</h2>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {recentSales.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">
                    {sale.customer?.name ?? "Client comptoir"}
                  </p>
                  <p className="mono text-[12px] text-muted-foreground">
                    {sale.number} · {formatTime(sale.created_at)}
                  </p>
                </div>
                <span className="tabular shrink-0 text-[15px] font-semibold">
                  {formatXAF(sale.total_including_tax)}
                </span>
              </li>
            ))}
            {recentSales.length === 0 && !isLoading && (
              <li className="py-3 text-[15px] text-muted-foreground">Aucune vente aujourd'hui.</li>
            )}
          </ul>
          <Button asChild variant="outline" className="mt-4 min-h-[44px] rounded-[10px]">
            <Link to="/ventes">Voir toutes les ventes</Link>
          </Button>
        </Card>

        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-[18px] text-warning" aria-hidden />
            <h2 className="text-[17px] font-semibold">Alertes de stock</h2>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {alerts.slice(0, 6).map((alert) => (
              <li key={alert.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px]">{alert.product?.label ?? "—"}</p>
                  <p className="mono text-[12px] text-muted-foreground">
                    {alert.product?.reference ?? "—"}
                  </p>
                </div>
                <Badge
                  className={
                    alert.quantity === 0
                      ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                      : "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                  }
                >
                  {alert.quantity === 0
                    ? "Rupture"
                    : `${alert.quantity} / ${alert.minimum_quantity}`}
                </Badge>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="py-3 text-[15px] text-muted-foreground">Aucune alerte en cours.</li>
            )}
          </ul>
          <Button asChild variant="outline" className="mt-4 min-h-[44px] rounded-[10px]">
            <Link to="/stock">Voir tout le stock</Link>
          </Button>
        </Card>
      </div>
    </PageBody>
  );
}
