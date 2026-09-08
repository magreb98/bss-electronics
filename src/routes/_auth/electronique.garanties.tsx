import { createFileRoute } from "@tanstack/react-router";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoWarranties } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/electronique/garanties")({
  head: () => ({
    meta: [
      { title: "Garanties — BSS POS" },
      {
        name: "description",
        content: "Vérifiez la validité des garanties constructeur et boutique par IMEI.",
      },
      { property: "og:title", content: "Garanties — BSS POS" },
      { property: "og:description", content: "Une réponse immédiate au comptoir." },
    ],
  }),
  component: WarrantiesPage,
});

function WarrantiesPage() {
  return (
    <PageBody>
      <PageHeader title="Garanties" description="Couverture des appareils vendus." />
      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>IMEI</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoWarranties.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="mono text-[12px]">{w.imei}</TableCell>
                <TableCell className="font-medium">{w.product}</TableCell>
                <TableCell>{w.customer}</TableCell>
                <TableCell className="tabular">{formatDate(w.starts_at)}</TableCell>
                <TableCell className="tabular">{formatDate(w.ends_at)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={
                      w.status === "active"
                        ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                        : "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                    }
                  >
                    {w.status === "active" ? "Active" : "Expirée"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
