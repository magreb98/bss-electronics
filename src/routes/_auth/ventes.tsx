import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchOrDemo } from "@/lib/api";
import { demoSales } from "@/lib/demo";
import { formatDateTime, formatXAF } from "@/lib/format";
import type { Sale } from "@/lib/types";

export const Route = createFileRoute("/_auth/ventes")({
  head: () => ({
    meta: [
      { title: "Ventes & retours — BSS POS" },
      {
        name: "description",
        content: "Historique des ventes, annulations, retours et paiements de la boutique.",
      },
      { property: "og:title", content: "Ventes & retours — BSS POS" },
      { property: "og:description", content: "Retrouvez chaque ticket et son règlement." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { data } = useQuery({
    queryKey: ["sales"],
    queryFn: () => fetchOrDemo<Sale[]>("/commerce/sales", demoSales),
    staleTime: 30_000,
  });

  return (
    <PageBody>
      <PageHeader title="Ventes" description="Tous les tickets encaissés et leurs statuts." />

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Vendeur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Articles</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="mono text-[12px]">{sale.reference}</TableCell>
                <TableCell className="font-medium">{sale.customer ?? "Client comptoir"}</TableCell>
                <TableCell className="text-muted-foreground">{sale.seller}</TableCell>
                <TableCell className="tabular">{formatDateTime(sale.created_at)}</TableCell>
                <TableCell className="tabular text-right">{sale.items}</TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {formatXAF(sale.total)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={
                      sale.status === "annulee"
                        ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                        : "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                    }
                  >
                    {sale.status === "annulee" ? "Annulée" : "Confirmée"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" className="min-h-[44px] rounded-[10px]">
          Charger plus
        </Button>
      </div>
    </PageBody>
  );
}
