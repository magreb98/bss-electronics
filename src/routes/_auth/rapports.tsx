import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, ShoppingCart, BarChart3, RotateCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { request } from "@/lib/api";
import { formatXAF } from "@/lib/format";

// ── Types réponses backend ────────────────────────────────────────────────────

interface DashboardReport {
  total_sale_count: number;
  total_excluding_tax: number;
  total_tax: number;
  total_including_tax: number;
  is_provisional: boolean;
  by_pos: {
    pos_id: string;
    pos_name: string;
    sale_count: number;
    total_including_tax: number;
  }[];
}

interface TopProduct {
  id: string;
  label: string;
  reference: string;
  total_quantity: number;
  total_revenue: number;
}

interface MarginSummary {
  total_ht: number;
  total_tax: number;
  total_ttc: number;
  sale_count: number;
}

interface CustomerRanking {
  id: string;
  name: string;
  phone: string | null;
  visit_count: number;
  total_spent: number;
}

interface StockRotation {
  id: string;
  label: string;
  reference: string;
  point_of_sale_id: string;
  units_sold: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toISO = (d: Date) => d.toISOString().split("T")[0]!;
const DEFAULT_TO = toISO(new Date());
const DEFAULT_FROM = toISO(new Date(Date.now() - 30 * 86_400_000));

function exportCsv(rows: string[][], filename: string) {
  const content = rows.map((r) => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">
        Chargement…
      </TableCell>
    </TableRow>
  );
}

function EmptyRow({ cols, message = "Aucune donnée pour cette période" }: { cols: number; message?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_auth/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports & analyses — BSS POS" },
      {
        name: "description",
        content: "Chiffre d'affaires, marges, meilleures ventes et performance clients.",
      },
      { property: "og:title", content: "Rapports & analyses — BSS POS" },
      { property: "og:description", content: "Pilotez la boutique avec des chiffres clairs." },
    ],
  }),
  component: ReportsPage,
});

// ── Page ──────────────────────────────────────────────────────────────────────

function ReportsPage() {
  const [tab, setTab] = useState("caisse");
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);

  const params = { from, to };

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["reports-dashboard", from, to],
    queryFn: () =>
      request<{ data: DashboardReport }>("/commerce/dashboard", { params }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: margin, isLoading: marginLoading } = useQuery({
    queryKey: ["reports-margin", from, to],
    queryFn: () =>
      request<{ data: MarginSummary }>("/commerce/reports/margin", { params }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: topProducts = [], isLoading: topLoading } = useQuery({
    queryKey: ["reports-top-products", from, to],
    queryFn: () =>
      request<{ data: TopProduct[] }>("/commerce/reports/top-products", {
        params: { ...params, limit: 15 },
      }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["reports-customers", from, to],
    queryFn: () =>
      request<{ data: CustomerRanking[] }>("/commerce/reports/customer-ranking", {
        params: { ...params, limit: 15 },
      }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: stockRotation = [], isLoading: stockLoading } = useQuery({
    queryKey: ["reports-stock-rotation", from, to],
    queryFn: () =>
      request<{ data: StockRotation[] }>("/commerce/reports/stock-rotation", {
        params: { ...params, limit: 20 },
      }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const avgBasket =
    margin && margin.sale_count > 0
      ? Math.round(margin.total_ttc / margin.sale_count)
      : 0;

  const byPosChart = (dashboard?.by_pos ?? []).map((p) => ({
    name: p.pos_name.length > 18 ? p.pos_name.slice(0, 18) + "…" : p.pos_name,
    ca: p.total_including_tax,
  }));

  const topChart = topProducts.slice(0, 8).map((p) => ({
    name: p.label.length > 22 ? p.label.slice(0, 22) + "…" : p.label,
    revenue: p.total_revenue,
  }));

  function handleExport() {
    if (tab === "caisse") {
      exportCsv(
        [
          ["Point de vente", "Ventes", "CA TTC (XAF)"],
          ...(dashboard?.by_pos ?? []).map((p) => [
            p.pos_name,
            String(p.sale_count),
            String(p.total_including_tax),
          ]),
        ],
        "bss-par-caisse.csv",
      );
    } else if (tab === "produits") {
      exportCsv(
        [
          ["#", "Produit", "Référence", "Qté vendue", "CA (XAF)"],
          ...topProducts.map((p, i) => [
            String(i + 1),
            p.label,
            p.reference,
            String(p.total_quantity),
            String(p.total_revenue),
          ]),
        ],
        "bss-top-produits.csv",
      );
    } else if (tab === "clients") {
      exportCsv(
        [
          ["#", "Client", "Téléphone", "Visites", "Total dépensé (XAF)", "Panier moyen (XAF)"],
          ...customers.map((c, i) => [
            String(i + 1),
            c.name,
            c.phone ?? "",
            String(c.visit_count),
            String(c.total_spent),
            String(c.visit_count > 0 ? Math.trunc(c.total_spent / c.visit_count) : 0),
          ]),
        ],
        "bss-clients.csv",
      );
    } else {
      exportCsv(
        [
          ["#", "Produit", "Référence", "Unités écoulées"],
          ...stockRotation.map((p, i) => [
            String(i + 1),
            p.label,
            p.reference,
            String(p.units_sold),
          ]),
        ],
        "bss-rotation-stock.csv",
      );
    }
  }

  return (
    <PageBody>
      <PageHeader
        title="Rapports"
        description="Analyses par période."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-[44px] w-[140px] rounded-[10px]"
            />
            <span className="text-sm text-muted-foreground">→</span>
            <Input
              type="date"
              value={to}
              min={from}
              max={DEFAULT_TO}
              onChange={(e) => setTo(e.target.value)}
              className="h-[44px] w-[140px] rounded-[10px]"
            />
            <Button variant="outline" className="min-h-[44px] rounded-[10px]" onClick={handleExport}>
              <Download className="size-4" aria-hidden />
              Exporter CSV
            </Button>
          </div>
        }
      />

      {/* KPI globaux */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="CA TTC"
          value={marginLoading ? "…" : formatXAF(margin?.total_ttc ?? 0)}
          icon={TrendingUp}
        />
        <KpiCard
          label="Ventes confirmées"
          value={marginLoading ? "…" : String(margin?.sale_count ?? 0)}
          icon={ShoppingCart}
        />
        <KpiCard
          label="Panier moyen"
          value={marginLoading ? "…" : formatXAF(avgBasket)}
          icon={BarChart3}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="caisse" className="min-h-[36px]">
            Par caisse
          </TabsTrigger>
          <TabsTrigger value="produits" className="min-h-[36px]">
            Top produits
          </TabsTrigger>
          <TabsTrigger value="clients" className="min-h-[36px]">
            Clients
          </TabsTrigger>
          <TabsTrigger value="rotation" className="min-h-[36px]">
            Rotation stock
          </TabsTrigger>
        </TabsList>

        {/* ── Par caisse ─────────────────────────────────────────────────────── */}
        <TabsContent value="caisse" className="mt-4 flex flex-col gap-4">
          {/* Résumé fiscal */}
          {!marginLoading && margin && (
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="CA HT"
                value={formatXAF(margin.total_ht)}
                icon={TrendingUp}
              />
              <KpiCard
                label="TVA collectée"
                value={formatXAF(margin.total_tax)}
                icon={BarChart3}
              />
              <KpiCard
                label="Taux TVA moyen"
                value={
                  margin.total_ht > 0
                    ? `${Math.round((margin.total_tax / margin.total_ht) * 100)} %`
                    : "—"
                }
                icon={RotateCcw}
              />
            </div>
          )}

          {/* Graphique par POS */}
          {!dashLoading && byPosChart.length > 1 && (
            <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <h2 className="text-[17px] font-semibold tracking-tight">
                CA TTC par point de vente
              </h2>
              <div className="mt-4 h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPosChart}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Inter" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Inter" }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                      tickFormatter={(v: number) => formatXAF(v)}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatXAF(v), "CA TTC"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--card-foreground)",
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="ca" fill="#0066CC" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Tableau par POS */}
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Point de vente</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">CA TTC (XAF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashLoading ? (
                  <LoadingRow cols={3} />
                ) : (dashboard?.by_pos ?? []).length === 0 ? (
                  <EmptyRow cols={3} />
                ) : (
                  (dashboard?.by_pos ?? []).map((p) => (
                    <TableRow key={p.pos_id}>
                      <TableCell className="font-medium">{p.pos_name}</TableCell>
                      <TableCell className="tabular text-right">{p.sale_count}</TableCell>
                      <TableCell className="tabular text-right font-semibold">
                        {formatXAF(p.total_including_tax)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Top produits ───────────────────────────────────────────────────── */}
        <TabsContent value="produits" className="mt-4 flex flex-col gap-4">
          {!topLoading && topChart.length > 0 && (
            <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <h2 className="text-[17px] font-semibold tracking-tight">
                Top 8 — chiffre d'affaires
              </h2>
              <div className="mt-4 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topChart} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Inter" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatXAF(v)}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "Inter" }}
                      axisLine={false}
                      tickLine={false}
                      width={165}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatXAF(v), "CA"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                        color: "var(--card-foreground)",
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="revenue" fill="#F59E0B" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Qté vendue</TableHead>
                  <TableHead className="text-right">CA (XAF)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLoading ? (
                  <LoadingRow cols={5} />
                ) : topProducts.length === 0 ? (
                  <EmptyRow cols={5} />
                ) : (
                  topProducts.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="mono w-8 text-[11px] text-muted-foreground">
                        #{i + 1}
                      </TableCell>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="mono text-[12px] text-muted-foreground">
                        {p.reference}
                      </TableCell>
                      <TableCell className="tabular text-right">{p.total_quantity}</TableCell>
                      <TableCell className="tabular text-right font-semibold">
                        {formatXAF(p.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Clients ────────────────────────────────────────────────────────── */}
        <TabsContent value="clients" className="mt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Visites</TableHead>
                  <TableHead className="text-right">Total dépensé</TableHead>
                  <TableHead className="text-right">Panier moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersLoading ? (
                  <LoadingRow cols={6} />
                ) : customers.length === 0 ? (
                  <EmptyRow cols={6} />
                ) : (
                  customers.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell className="mono w-8 text-[11px] text-muted-foreground">
                        #{i + 1}
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="mono text-[13px] text-muted-foreground">
                        {c.phone ?? "—"}
                      </TableCell>
                      <TableCell className="tabular text-right">{c.visit_count}</TableCell>
                      <TableCell className="tabular text-right font-semibold">
                        {formatXAF(c.total_spent)}
                      </TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">
                        {formatXAF(
                          c.visit_count > 0 ? Math.trunc(c.total_spent / c.visit_count) : 0,
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── Rotation stock ─────────────────────────────────────────────────── */}
        <TabsContent value="rotation" className="mt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Unités écoulées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockLoading ? (
                  <LoadingRow cols={4} />
                ) : stockRotation.length === 0 ? (
                  <EmptyRow cols={4} />
                ) : (
                  stockRotation.map((p, i) => (
                    <TableRow key={`${p.id}-${p.point_of_sale_id}`}>
                      <TableCell className="mono w-8 text-[11px] text-muted-foreground">
                        #{i + 1}
                      </TableCell>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="mono text-[12px] text-muted-foreground">
                        {p.reference}
                      </TableCell>
                      <TableCell className="tabular text-right font-semibold">
                        {p.units_sold}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}
