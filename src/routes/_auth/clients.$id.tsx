import { createFileRoute } from "@tanstack/react-router";
import { Receipt, ShoppingBag, Wallet } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoCustomers, demoSales, demoWarranties } from "@/lib/demo";
import { formatDate, formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/clients/$id")({
  head: () => ({
    meta: [
      { title: "Fiche client — BSS POS" },
      {
        name: "description",
        content: "Historique d'achats, avoirs disponibles et garanties du client.",
      },
      { property: "og:title", content: "Fiche client — BSS POS" },
      { property: "og:description", content: "Tout l'historique d'un client en un écran." },
    ],
  }),
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { id } = Route.useParams();
  const customer = demoCustomers.find((c) => String(c.id) === id) ?? demoCustomers[0];
  const sales = demoSales.filter((s) => s.customer === customer.name);
  const average = sales.length
    ? Math.trunc(sales.reduce((sum, s) => sum + s.total, 0) / sales.length)
    : 0;

  return (
    <PageBody>
      <PageHeader
        title={customer.name}
        description={customer.phone}
        action={
          customer.credit > 0 ? (
            <Badge className="tabular border-transparent bg-success/15 px-3 py-1 text-[12px] font-semibold text-foreground">
              Avoir {formatXAF(customer.credit)}
            </Badge>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total dépensé" value={formatXAF(customer.total_spent)} icon={Wallet} />
        <KpiCard label="Achats" value={String(customer.sales_count)} icon={ShoppingBag} />
        <KpiCard label="Panier moyen" value={formatXAF(average)} icon={Receipt} />
      </div>

      <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
        <Tabs defaultValue="achats">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="infos" className="min-h-[36px]">
              Informations
            </TabsTrigger>
            <TabsTrigger value="achats" className="min-h-[36px]">
              Historique achats
            </TabsTrigger>
            <TabsTrigger value="garanties" className="min-h-[36px]">
              Garanties
            </TabsTrigger>
          </TabsList>

          <TabsContent value="infos" className="pt-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] border border-border p-3">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Téléphone
                </dt>
                <dd className="mono mt-1 text-[15px]">{customer.phone}</dd>
              </div>
              <div className="rounded-[12px] border border-border p-3">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Avoir disponible
                </dt>
                <dd className="tabular mt-1 text-[15px]">{formatXAF(customer.credit)}</dd>
              </div>
            </dl>
          </TabsContent>

          <TabsContent value="achats" className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Articles</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="mono text-[12px]">{s.reference}</TableCell>
                      <TableCell className="tabular">{formatDateTime(s.created_at)}</TableCell>
                      <TableCell className="tabular text-right">{s.items}</TableCell>
                      <TableCell className="tabular text-right">{formatXAF(s.total)}</TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Aucun achat enregistré.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="garanties" className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Fin de garantie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demoWarranties
                    .filter((w) => w.customer === customer.name)
                    .map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="mono text-[12px]">{w.imei}</TableCell>
                        <TableCell>{w.product}</TableCell>
                        <TableCell className="tabular text-right">{formatDate(w.ends_at)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </PageBody>
  );
}
