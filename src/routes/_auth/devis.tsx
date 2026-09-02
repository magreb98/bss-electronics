import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoCustomers } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/devis")({
  head: () => ({
    meta: [
      { title: "Devis — BSS POS" },
      {
        name: "description",
        content: "Créez des devis clients et convertissez-les en ventes en un clic.",
      },
      { property: "og:title", content: "Devis — BSS POS" },
      { property: "og:description", content: "Du devis à la vente sans ressaisie." },
    ],
  }),
  component: QuotesPage,
});

const quotes = demoCustomers.slice(0, 4).map((c, i) => ({
  id: i + 1,
  reference: `DEV-00${21 + i}`,
  customer: c.name,
  total: 120000 * (i + 1),
  valid_until: new Date(Date.now() + (i + 3) * 86_400_000).toISOString(),
  status: i === 0 ? "converti" : i === 1 ? "expire" : "en_attente",
}));

export function QuotesPage() {
  return (
    <PageBody>
      <PageHeader
        title="Devis"
        description="Propositions commerciales en attente de conversion."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouveau devis
          </Button>
        }
      />
      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Validité</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="mono text-[12px]">{q.reference}</TableCell>
                <TableCell className="font-medium">{q.customer}</TableCell>
                <TableCell className="tabular">{formatDate(q.valid_until)}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(q.total)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={
                      q.status === "expire"
                        ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                        : q.status === "converti"
                          ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                          : "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                    }
                  >
                    {q.status === "expire"
                      ? "Expiré"
                      : q.status === "converti"
                        ? "Converti"
                        : "En attente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="min-h-[44px] rounded-[10px]"
                    disabled={q.status !== "en_attente"}
                  >
                    Convertir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
