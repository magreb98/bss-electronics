import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download, TrendingUp, Users } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoDashboard, demoProducts } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports & analyses — BSS POS" },
      {
        name: "description",
        content: "Chiffre d'affaires, marges, meilleures ventes et performance vendeurs.",
      },
      { property: "og:title", content: "Rapports & analyses — BSS POS" },
      { property: "og:description", content: "Pilotez la boutique avec des chiffres clairs." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const series = demoDashboard.revenue_series.slice(-14).map((p) => ({
    label: formatDate(p.date),
    value: p.value,
  }));
  const total = series.reduce((s, p) => s + p.value, 0);
  const best = [...demoProducts].sort((a, b) => b.price - a.price).slice(0, 6);

  return (
    <PageBody>
      <PageHeader
        title="Rapports"
        description="Performance des 14 derniers jours."
        action={
          <Button variant="outline" className="min-h-[44px] rounded-[10px]">
            <Download className="size-4" aria-hidden />
            Exporter CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="CA 14 jours" value={formatXAF(total)} icon={TrendingUp} />
        <KpiCard
          label="Panier moyen"
          value={formatXAF(demoDashboard.average_basket)}
          icon={BarChart3}
        />
        <KpiCard label="Clients servis" value={String(demoDashboard.customers_today)} icon={Users} />
      </div>

      <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
        <h2 className="text-[17px] font-semibold">Chiffre d'affaires par jour</h2>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
                width={70}
                tickFormatter={(v: number) => formatXAF(v)}
              />
              <Tooltip
                formatter={(v: number) => formatXAF(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--card-foreground)",
                }}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>Famille</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {best.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.family}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(p.price)}</TableCell>
                <TableCell className="tabular text-right">{p.stock}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
