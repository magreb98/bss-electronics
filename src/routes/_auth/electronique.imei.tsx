import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoSerialUnits } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/electronique/imei")({
  head: () => ({
    meta: [
      { title: "Suivi IMEI & numéros de série — BSS POS" },
      {
        name: "description",
        content: "Recherchez un IMEI, vérifiez son statut et retracez son parcours en boutique.",
      },
      { property: "og:title", content: "Suivi IMEI — BSS POS" },
      { property: "og:description", content: "Chaque appareil tracé de la réception à la vente." },
    ],
  }),
  component: ImeiPage,
});

const statusStyles: Record<string, string> = {
  disponible: "bg-success/15 text-foreground",
  vendu: "bg-muted text-foreground",
  reserve: "bg-warning/20 text-foreground",
  hs: "bg-destructive/15 text-destructive",
};

function ImeiPage() {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return demoSerialUnits;
    return demoSerialUnits.filter(
      (u) => u.imei.includes(q) || u.product_name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <PageBody>
      <PageHeader title="IMEI & séries" description="Parc d'appareils identifiés individuellement." />

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un IMEI ou un modèle"
          aria-label="Rechercher un IMEI"
          className="mono min-h-[44px] rounded-[10px] pl-9"
        />
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>IMEI / série</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Entré le</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="mono text-[12px]">{u.imei}</TableCell>
                <TableCell className="font-medium">{u.product_name}</TableCell>
                <TableCell className="tabular">{formatDate(u.entered_at)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={`border-transparent text-[11px] font-semibold ${statusStyles[u.status] ?? "bg-muted"}`}
                  >
                    {u.status === "hs" ? "Hors service" : u.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Aucun appareil ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
