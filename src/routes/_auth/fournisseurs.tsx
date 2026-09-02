import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoSuppliers } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/fournisseurs")({
  head: () => ({
    meta: [
      { title: "Fournisseurs & commandes — BSS POS" },
      {
        name: "description",
        content: "Gérez vos fournisseurs, commandes d'approvisionnement et réceptions de stock.",
      },
      { property: "og:title", content: "Fournisseurs & commandes — BSS POS" },
      { property: "og:description", content: "Approvisionnez la boutique sans rupture." },
    ],
  }),
  component: SuppliersPage,
});

const orders = [
  { id: 221, reference: "CMD-221", supplier: "Tech Import Douala", total: 4200000, status: "receptionnee", at: new Date(Date.now() - 86_400_000).toISOString() },
  { id: 222, reference: "CMD-222", supplier: "Accessoires Plus", total: 640000, status: "en_attente", at: new Date().toISOString() },
];

function SuppliersPage() {
  return (
    <PageBody>
      <PageHeader
        title="Fournisseurs"
        description="Partenaires d'approvisionnement et commandes en cours."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouveau fournisseur
          </Button>
        }
      />

      <Tabs defaultValue="fournisseurs">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="fournisseurs" className="min-h-[36px]">
            Fournisseurs
          </TabsTrigger>
          <TabsTrigger value="commandes" className="min-h-[36px]">
            Commandes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fournisseurs" className="pt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead className="text-right">Solde dû</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoSuppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="mono text-[12px] text-muted-foreground">{s.phone}</TableCell>
                    <TableCell className="text-muted-foreground">{s.city}</TableCell>
                    <TableCell className="tabular text-right">{formatXAF(s.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="commandes" className="pt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="mono text-[12px]">{o.reference}</TableCell>
                    <TableCell className="font-medium">{o.supplier}</TableCell>
                    <TableCell className="tabular">{formatDate(o.at)}</TableCell>
                    <TableCell className="tabular text-right">{formatXAF(o.total)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          o.status === "receptionnee"
                            ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                            : "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                        }
                      >
                        {o.status === "receptionnee" ? "Réceptionnée" : "En attente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}
