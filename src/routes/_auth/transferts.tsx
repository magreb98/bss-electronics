import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { demoTransfers } from "@/lib/demo";
import { formatDate, formatInt } from "@/lib/format";

export const Route = createFileRoute("/_auth/transferts")({
  head: () => ({
    meta: [
      { title: "Transferts inter-boutiques — BSS POS" },
      {
        name: "description",
        content: "Suivez les transferts de stock entre vos boutiques, en transit et réceptionnés.",
      },
      { property: "og:title", content: "Transferts inter-boutiques — BSS POS" },
      { property: "og:description", content: "Déplacez votre stock entre points de vente." },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  return (
    <PageBody>
      <PageHeader
        title="Transferts"
        description="Mouvements de stock entre boutiques."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouveau transfert
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {demoTransfers.map((t) => (
          <Card key={t.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="mono text-[12px] text-muted-foreground">{t.reference}</p>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-[15px] font-semibold">
                  <span className="truncate">{t.from}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{t.to}</span>
                </div>
                <p className="tabular mt-1 text-[12px] text-muted-foreground">
                  {formatInt(t.items)} articles · {formatDate(t.created_at)}
                </p>
              </div>
              <Badge
                className={
                  t.status === "recu"
                    ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                    : "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                }
              >
                {t.status === "recu" ? "Reçu" : t.status === "expedie" ? "En transit" : "Créé"}
              </Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="min-h-[44px] flex-1 rounded-[10px]">
                Détail
              </Button>
              <Button
                className="min-h-[44px] flex-1 rounded-[10px]"
                disabled={t.status === "receptionne"}
              >
                Réceptionner
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}
