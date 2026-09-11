import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, ShoppingBag, Wallet } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { request } from "@/lib/api";
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

interface BackendCustomer {
  id: string;
  name: string;
  phone?: string | null;
  outstanding_balance?: number | null;
  total_spent?: number | null;
  sales_count?: number | null;
}

interface BackendSaleItem {
  id: string;
  number: string;
  total_including_tax: number;
  created_at: string;
  lines_count?: number | null;
}

interface BackendWarranty {
  id: string;
  serial_unit?: { serial_number: string } | null;
  product?: { label: string } | null;
  ends_at: string;
  status: string;
}

function CustomerDetailPage() {
  const { id } = Route.useParams();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () =>
      request<{ data: BackendCustomer }>(`/commerce/customers/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 60_000,
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["customer-sales", id],
    queryFn: () =>
      request<{ data: BackendSaleItem[] }>(`/commerce/sales?customer_id=${id}&per_page=10`)
        .then((r) => r.data)
        .catch(() => [] as BackendSaleItem[]),
    staleTime: 30_000,
  });

  const { data: warranties = [], isLoading: loadingWarranties } = useQuery({
    queryKey: ["customer-warranties", id],
    queryFn: () =>
      request<{ data: BackendWarranty[] }>(`/electronics/warranties?customer_id=${id}`)
        .then((r) => r.data)
        .catch(() => [] as BackendWarranty[]),
    staleTime: 60_000,
  });

  const totalSpent = customer?.total_spent ?? 0;
  const salesCount = customer?.sales_count ?? 0;
  const credit = customer?.outstanding_balance ?? 0;
  const average = salesCount > 0 ? Math.trunc(totalSpent / salesCount) : 0;

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[124px] rounded-[16px]" />)}
        </div>
        <Skeleton className="h-48 rounded-[16px]" />
      </PageBody>
    );
  }

  if (!customer) {
    return (
      <PageBody>
        <Link to="/clients" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour aux clients
        </Link>
        <p className="py-8 text-center text-muted-foreground">Client introuvable.</p>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={customer.name}
        description={customer.phone ?? ""}
        action={
          credit > 0 ? (
            <Badge className="tabular border-transparent bg-success/15 px-3 py-1 text-[12px] font-semibold text-foreground">
              Avoir {formatXAF(credit)}
            </Badge>
          ) : null
        }
      />

      <Link to="/clients" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux clients
      </Link>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total dépensé" value={formatXAF(totalSpent)} icon={Wallet} />
        <KpiCard label="Achats" value={String(salesCount)} icon={ShoppingBag} />
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
                <dd className="mono mt-1 text-[15px]">{customer.phone ?? "—"}</dd>
              </div>
              <div className="rounded-[12px] border border-border p-3">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Avoir disponible
                </dt>
                <dd className="tabular mt-1 text-[15px]">{formatXAF(credit)}</dd>
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
                  {loadingSales ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Chargement…
                      </TableCell>
                    </TableRow>
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Aucun achat enregistré.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="mono text-[12px]">{s.number}</TableCell>
                        <TableCell className="tabular">{formatDateTime(s.created_at)}</TableCell>
                        <TableCell className="tabular text-right">{s.lines_count ?? "—"}</TableCell>
                        <TableCell className="tabular text-right">{formatXAF(s.total_including_tax)}</TableCell>
                      </TableRow>
                    ))
                  )}
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
                  {loadingWarranties ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Chargement…
                      </TableCell>
                    </TableRow>
                  ) : warranties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Aucune garantie enregistrée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warranties.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="mono text-[12px]">
                          {w.serial_unit?.serial_number ?? "—"}
                        </TableCell>
                        <TableCell>{w.product?.label ?? "—"}</TableCell>
                        <TableCell className="tabular text-right">{formatDate(w.ends_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </PageBody>
  );
}
