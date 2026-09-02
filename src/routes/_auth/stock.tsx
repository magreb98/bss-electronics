import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fetchOrDemo } from "@/lib/api";
import { demoProducts, demoStockMovements } from "@/lib/demo";
import { formatDateTime, formatInt, formatXAF } from "@/lib/format";
import type { Product, StockMovement } from "@/lib/types";

export const Route = createFileRoute("/_auth/stock")({
  head: () => ({
    meta: [
      { title: "Stock & alertes — BSS POS" },
      {
        name: "description",
        content: "Niveaux de stock, seuils d'alerte et historique des mouvements de la boutique.",
      },
      { property: "og:title", content: "Stock & alertes — BSS POS" },
      { property: "og:description", content: "Surveillez ruptures et valeur de stock en temps réel." },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { data: products } = useQuery({
    queryKey: ["stock"],
    queryFn: () => fetchOrDemo<Product[]>("/commerce/stock", demoProducts),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: movements } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => fetchOrDemo<StockMovement[]>("/commerce/stock/movements", demoStockMovements),
    staleTime: 30_000,
  });

  const rows = products ?? [];
  const totalValue = rows.reduce((sum, p) => sum + p.stock * p.cost_price, 0);

  const exportCsv = () => {
    const csv = [
      "produit;sku;stock;seuil;valeur",
      ...rows.map((p) => `${p.name};${p.sku};${p.stock};${p.min_stock};${p.stock * p.cost_price}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "stock.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageBody>
      <PageHeader
        title="Stock"
        description={`Valeur totale du stock : ${formatXAF(totalValue)}`}
        action={
          <Button variant="outline" className="min-h-[44px] rounded-[10px]" onClick={exportCsv}>
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Tabs defaultValue="niveaux">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="niveaux" className="min-h-[36px]">
            Niveaux
          </TabsTrigger>
          <TabsTrigger value="alertes" className="min-h-[36px]">
            Alertes
          </TabsTrigger>
          <TabsTrigger value="mouvements" className="min-h-[36px]">
            Mouvements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="niveaux" className="pt-4">
          <StockTable rows={rows} />
        </TabsContent>

        <TabsContent value="alertes" className="pt-4">
          <StockTable rows={rows.filter((p) => p.stock <= p.min_stock)} />
        </TabsContent>

        <TabsContent value="mouvements" className="pt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movements ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.product}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{m.type}</TableCell>
                    <TableCell
                      className={cn("tabular text-right", m.qty < 0 ? "text-destructive" : "text-success")}
                    >
                      {m.qty > 0 ? `+${m.qty}` : m.qty}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.reason}</TableCell>
                    <TableCell className="tabular text-right">{formatDateTime(m.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}

function StockTable({ rows }: { rows: Product[] }) {
  return (
    <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Seuil</TableHead>
            <TableHead className="text-right">Valeur stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      p.stock === 0
                        ? "bg-destructive"
                        : p.stock <= p.min_stock
                          ? "bg-warning"
                          : "bg-success",
                    )}
                  />
                  {p.name}
                </span>
              </TableCell>
              <TableCell className="mono text-[12px] text-muted-foreground">{p.sku}</TableCell>
              <TableCell className="tabular text-right">{formatInt(p.stock)}</TableCell>
              <TableCell className="tabular text-right text-muted-foreground">
                {formatInt(p.min_stock)}
              </TableCell>
              <TableCell className="tabular text-right">{formatXAF(p.stock * p.cost_price)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Aucun produit concerné.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  );
}
