import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Receipt, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOrDemo } from "@/lib/api";
import { demoDashboard, demoProducts } from "@/lib/demo";
import { formatXAF, formatTime } from "@/lib/format";
import { useCashSession } from "@/hooks/use-cash-session";
import type { DashboardData, Product } from "@/lib/types";

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

function DashboardPage() {
  const { session } = useCashSession();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchOrDemo<DashboardData>("/commerce/dashboard", demoDashboard),
    staleTime: 30_000,
  });

  const { data: alerts } = useQuery({
    queryKey: ["stock-alerts"],
    queryFn: () =>
      fetchOrDemo<Product[]>(
        "/commerce/stock/alerts",
        demoProducts.filter((p) => p.stock <= p.min_stock),
      ),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const chartData = (data ?? demoDashboard).revenue_series.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(
      new Date(point.date),
    ),
  }));

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
              value={formatXAF(data!.revenue_today)}
              hint="Encaissements confirmés"
              icon={TrendingUp}
            />
            <KpiCard
              label="Ventes"
              value={String(data!.sales_count)}
              hint="Tickets du jour"
              icon={Receipt}
            />
            <KpiCard
              label="Panier moyen"
              value={formatXAF(data!.average_basket)}
              hint="Par ticket"
              icon={ShoppingCart}
            />
            <KpiCard
              label="Clients"
              value={String(data!.customers_today)}
              hint="Servis aujourd'hui"
              icon={Users}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold">Chiffre d'affaires — 30 jours</h2>
            <span className="tabular text-[12px] text-muted-foreground">
              {formatXAF(chartData.reduce((sum, p) => sum + p.value, 0))}
            </span>
          </div>
          <div className="mt-4 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={5}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  cursor={{ stroke: "var(--color-border)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatXAF(Number(value)), "CA"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-[18px] text-warning" aria-hidden />
            <h2 className="text-[17px] font-semibold">Alertes de stock</h2>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {(alerts ?? []).slice(0, 6).map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px]">{product.name}</p>
                  <p className="mono text-[12px] text-muted-foreground">{product.sku}</p>
                </div>
                <Badge
                  className={
                    product.stock === 0
                      ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                      : "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                  }
                >
                  {product.stock === 0 ? "Rupture" : `${product.stock} / ${product.min_stock}`}
                </Badge>
              </li>
            ))}
            {(alerts ?? []).length === 0 ? (
              <li className="py-3 text-[15px] text-muted-foreground">Aucune alerte en cours.</li>
            ) : null}
          </ul>
          <Button asChild variant="outline" className="mt-4 min-h-[44px] rounded-[10px]">
            <Link to="/stock">Voir tout le stock</Link>
          </Button>
        </Card>
      </div>

      <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
        <h2 className="text-[17px] font-semibold">Dernières ventes</h2>
        <ul className="mt-2 flex flex-col divide-y divide-border">
          {(data ?? demoDashboard).recent_sales.map((sale) => (
            <li key={sale.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{sale.customer ?? "Client comptoir"}</p>
                <p className="mono text-[12px] text-muted-foreground">
                  {sale.reference} · {formatTime(sale.created_at)}
                </p>
              </div>
              <span className="tabular shrink-0 text-[15px] font-semibold">
                {formatXAF(sale.total)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </PageBody>
  );
}
