import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wrench } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoTickets } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/electronique/sav")({
  head: () => ({
    meta: [
      { title: "Service après-vente — BSS POS" },
      {
        name: "description",
        content: "Suivez les réparations, diagnostics et restitutions d'appareils clients.",
      },
      { property: "og:title", content: "Service après-vente — BSS POS" },
      { property: "og:description", content: "Chaque réparation suivie étape par étape." },
    ],
  }),
  component: ServicePage,
});

const steps = ["depose", "diagnostic", "reparation", "pret", "restitue"] as const;
const labels: Record<string, string> = {
  depose: "Déposé",
  diagnostic: "Diagnostic",
  reparation: "Réparation",
  pret: "Prêt",
  restitue: "Restitué",
};

function ServicePage() {
  return (
    <PageBody>
      <PageHeader
        title="SAV"
        description="Tickets de réparation en cours."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouveau ticket
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {demoTickets.map((t) => {
          const index = steps.indexOf(t.status as (typeof steps)[number]);
          return (
            <Card key={t.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="mono text-[12px] text-muted-foreground">{t.reference}</p>
                  <h2 className="truncate text-[16px] font-semibold">{t.product}</h2>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {t.customer} · {formatDate(t.created_at)}
                  </p>
                </div>
                <Badge
                  className={
                    t.under_warranty
                      ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                      : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                  }
                >
                  {t.under_warranty ? "Sous garantie" : "Hors garantie"}
                </Badge>
              </div>

              <ol className="mt-4 flex flex-wrap gap-1.5">
                {steps.map((s, i) => (
                  <li
                    key={s}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      i <= index ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {labels[s]}
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex items-center justify-between">
                <span className="mono text-[12px] text-muted-foreground">{t.imei}</span>
                <span className="tabular text-[15px] font-semibold">
                  {formatXAF(t.repair_cost)}
                </span>
              </div>

              <Button variant="outline" className="mt-4 min-h-[44px] rounded-[10px]">
                <Wrench className="size-4" aria-hidden />
                Faire avancer
              </Button>
            </Card>
          );
        })}
      </div>
    </PageBody>
  );
}
