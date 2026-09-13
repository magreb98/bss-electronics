import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { request } from "@/lib/api";
import { adaptSales } from "@/lib/adapters";
import { formatDateTime, formatXAF } from "@/lib/format";
import type { BackendSale, Sale } from "@/lib/types";

export const Route = createFileRoute("/_auth/ventes/")({
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

interface SalesPageResponse {
  data: BackendSale[];
  meta: { current_page: number; last_page: number };
}

function SalesPage() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Sale[]>([]);
  const [lastPage, setLastPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ["sales", page],
    queryFn: () =>
      request<SalesPageResponse>("/commerce/sales", { params: { page } })
        .catch(() => ({ data: [], meta: { current_page: 1, last_page: 1 } }) as SalesPageResponse),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data) return;
    setRows((prev) => (page === 1 ? adaptSales(data.data) : [...prev, ...adaptSales(data.data)]));
    setLastPage(data.meta.last_page);
  }, [data, page]);

  const hasMore = page < lastPage;

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
            {rows.map((sale) => (
              <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/40">
                <TableCell className="mono text-[12px]">
                  <Link to="/ventes/$id" params={{ id: String(sale.id) }} className="hover:text-primary transition-colors">
                    {sale.reference}
                  </Link>
                </TableCell>
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
            {rows.length === 0 && !isFetching && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucune vente trouvée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {hasMore && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="min-h-[44px] rounded-[10px]"
            disabled={isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            {isFetching && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Charger plus
          </Button>
        </div>
      )}
    </PageBody>
  );
}
