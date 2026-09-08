import { createFileRoute } from "@tanstack/react-router";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoInstallments, demoSchedules } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/electronique/echeanciers")({
  head: () => ({
    meta: [
      { title: "Paiements échelonnés — BSS POS" },
      {
        name: "description",
        content: "Suivez les échéanciers clients, versements réglés et retards de paiement.",
      },
      { property: "og:title", content: "Paiements échelonnés — BSS POS" },
      { property: "og:description", content: "Vendez en plusieurs fois en toute sérénité." },
    ],
  }),
  component: SchedulesPage,
});

function SchedulesPage() {
  return (
    <PageBody>
      <PageHeader title="Échéanciers" description="Ventes réglées en plusieurs versements." />

      <div className="grid gap-4 lg:grid-cols-3">
        {demoSchedules.map((s) => {
          const ratio = Math.round((s.paid / s.total) * 100);
          return (
            <Card key={s.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="mono text-[12px] text-muted-foreground">{s.reference}</p>
                  <h2 className="truncate text-[16px] font-semibold">{s.customer}</h2>
                  <p className="truncate text-[13px] text-muted-foreground">{s.product}</p>
                </div>
                <Badge
                  className={
                    s.status === "retard"
                      ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                      : s.status === "solde"
                        ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                        : "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                  }
                >
                  {s.status === "retard" ? "En retard" : s.status === "solde" ? "Soldé" : "En cours"}
                </Badge>
              </div>

              <Progress value={ratio} className="mt-4 h-2" />
              <p className="tabular mt-2 text-[12px] text-muted-foreground">
                {s.installments_paid}/{s.installments_total} versements ·{" "}
                {formatXAF(s.paid)} sur {formatXAF(s.total)}
              </p>
              <p className="tabular mt-1 text-[12px] text-muted-foreground">
                Prochaine échéance {formatDate(s.next_due)}
              </p>
              <Button className="mt-4 min-h-[44px] rounded-[10px]" disabled={s.status === "solde"}>
                Encaisser un versement
              </Button>
            </Card>
          );
        })}
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoInstallments.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.customer}</TableCell>
                <TableCell className="tabular">{formatDate(i.due_date)}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(i.amount)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={
                      i.status === "retard"
                        ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                        : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                    }
                  >
                    {i.status === "retard" ? "En retard" : "À venir"}
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
