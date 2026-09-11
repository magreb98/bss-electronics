import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/lib/api";
import type { BackendProduct } from "@/lib/types";

export const Route = createFileRoute("/_auth/electronique/fiches/")({
  head: () => ({
    meta: [
      { title: "Fiches techniques — BSS POS" },
      {
        name: "description",
        content: "Fiches techniques des appareils électroniques : processeur, RAM, écran, batterie.",
      },
      { property: "og:title", content: "Fiches techniques — BSS POS" },
    ],
  }),
  component: DeviceSpecsPage,
});

function DeviceSpecsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-serialized-fiches"],
    queryFn: () =>
      request<{ data: BackendProduct[] }>("/commerce/products?granularity=serial")
        .then((r) => r.data)
        .catch(() => [] as BackendProduct[]),
    staleTime: 60_000,
  });

  return (
    <PageBody>
      <PageHeader
        title="Fiches techniques"
        description="Spécifications des appareils électroniques en catalogue."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5" disabled>
            <Plus className="size-4" aria-hidden />
            Nouvelle fiche
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-[16px]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Aucun produit sérialisé en catalogue.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} to="/electronique/fiches/$id" params={{ id: p.id }}>
              <Card className="gap-3 rounded-[16px] border-border p-5 shadow-none transition-colors hover:border-primary/40 hover:bg-accent/30 cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="mono text-[11px] text-muted-foreground">{p.reference}</p>
                    <h2 className="truncate text-[15px] font-semibold">{p.label}</h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.family && (
                      <Badge className="border-transparent bg-primary/10 text-[11px] text-primary">
                        {p.family.name}
                      </Badge>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  Cliquez pour voir ou modifier la fiche technique.
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageBody>
  );
}
