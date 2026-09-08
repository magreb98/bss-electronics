import { createFileRoute } from "@tanstack/react-router";
import { Plus, Tag } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { demoPromotions } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & coupons — BSS POS" },
      {
        name: "description",
        content: "Créez remises, coupons et campagnes promotionnelles applicables en caisse.",
      },
      { property: "og:title", content: "Promotions & coupons — BSS POS" },
      { property: "og:description", content: "Boostez vos ventes avec des offres ciblées." },
    ],
  }),
  component: PromotionsPage,
});

function PromotionsPage() {
  return (
    <PageBody>
      <PageHeader
        title="Promotions"
        description="Campagnes actives et coupons utilisables en caisse."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouvelle promotion
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoPromotions.map((p) => (
          <Card key={p.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Tag className="size-4 shrink-0 text-primary" aria-hidden />
                  <h2 className="truncate text-[16px] font-semibold">{p.name}</h2>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Du {formatDate(p.starts_at)} au {formatDate(p.ends_at)}
                </p>
              </div>
              <Switch defaultChecked={p.active} aria-label={`Activer ${p.name}`} />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Badge className="tabular border-transparent bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
                -{p.value}
                {p.type === "pourcentage" ? " %" : " XAF"}
              </Badge>
              <span className="tabular text-[12px] text-muted-foreground">
                jusqu'au {formatDate(p.ends_at)}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}
