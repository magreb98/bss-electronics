import { createFileRoute } from "@tanstack/react-router";
import { FileDown, Plus } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoInvoices } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/factures")({
  head: () => ({
    meta: [
      { title: "Factures B2B — BSS POS" },
      {
        name: "description",
        content: "Suivez vos factures professionnelles, règlements partiels et soldes dus.",
      },
      { property: "og:title", content: "Factures B2B — BSS POS" },
      { property: "og:description", content: "Facturation entreprise et suivi des encaissements." },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  return (
    <PageBody>
      <PageHeader
        title="Factures B2B"
        description="Factures professionnelles et suivi des règlements."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouvelle facture
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {demoInvoices.map((invoice) => {
          const ratio = Math.round((invoice.paid / invoice.total) * 100);
          return (
            <Card key={invoice.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="mono text-[12px] text-muted-foreground">{invoice.number}</p>
                  <h2 className="truncate text-[17px] font-semibold">{invoice.customer}</h2>
                  <p className="text-[12px] text-muted-foreground">
                    Émise le {formatDate(invoice.issued_at)}
                  </p>
                </div>
                <Badge
                  className={
                    invoice.status === "payee"
                      ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                      : invoice.status === "partielle"
                        ? "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                        : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                  }
                >
                  {invoice.status}
                </Badge>
              </div>

              <Progress value={ratio} className="mt-4 h-2" />
              <div className="mt-2 flex items-center justify-between text-[13px]">
                <span className="tabular text-muted-foreground">
                  Réglé {formatXAF(invoice.paid)} / {formatXAF(invoice.total)}
                </span>
                <span className="tabular font-semibold">
                  Solde {formatXAF(invoice.total - invoice.paid)}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="min-h-[44px] flex-1 rounded-[10px]">
                  <FileDown className="size-4" aria-hidden />
                  PDF
                </Button>
                <Button className="min-h-[44px] flex-1 rounded-[10px]">Encaisser</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Réglé</TableHead>
              <TableHead className="text-right">Solde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoInvoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="mono text-[12px]">{i.number}</TableCell>
                <TableCell className="font-medium">{i.customer}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(i.total)}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(i.paid)}</TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {formatXAF(i.total - i.paid)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
