import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchOrDemo } from "@/lib/api";
import { demoCustomers } from "@/lib/demo";
import { formatXAF } from "@/lib/format";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/_auth/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — BSS POS" },
      {
        name: "description",
        content: "Fichier client : coordonnées, avoirs disponibles et historique d'achats.",
      },
      { property: "og:title", content: "Clients — BSS POS" },
      { property: "og:description", content: "Fidélisez vos clients avec un fichier centralisé." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ["customers", debounced],
    queryFn: () => fetchOrDemo<Customer[]>("/commerce/customers", demoCustomers, { search: debounced }),
    staleTime: 30_000,
  });

  const rows = (data ?? []).filter(
    (c) =>
      !debounced ||
      c.name.toLowerCase().includes(debounced.toLowerCase()) ||
      c.phone.includes(debounced),
  );

  return (
    <PageBody>
      <PageHeader
        title="Clients"
        description="Base clients de la boutique."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouveau client
          </Button>
        }
      />

      <div className="relative max-w-[420px]">
        <Search
          className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          aria-label="Rechercher un client"
          className="min-h-[44px] rounded-[10px] pl-10"
        />
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="text-right">Achats</TableHead>
              <TableHead className="text-right">Total dépensé</TableHead>
              <TableHead className="text-right">Avoir</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">{c.phone}</TableCell>
                <TableCell className="tabular text-right">{c.sales_count}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(c.total_spent)}</TableCell>
                <TableCell className="text-right">
                  {c.credit > 0 ? (
                    <Badge className="tabular border-transparent bg-success/15 text-[11px] font-semibold text-foreground">
                      {formatXAF(c.credit)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" className="min-h-[44px] rounded-[10px]">
                    <Link to="/clients/$id" params={{ id: String(c.id) }}>
                      Ouvrir
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
