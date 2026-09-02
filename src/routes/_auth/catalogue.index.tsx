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
import { cn } from "@/lib/utils";
import { fetchOrDemo } from "@/lib/api";
import { demoProducts } from "@/lib/demo";
import { formatXAF } from "@/lib/format";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/_auth/catalogue/")({
  head: () => ({
    meta: [
      { title: "Catalogue produits — BSS POS" },
      {
        name: "description",
        content: "Gérez smartphones, tablettes et accessoires : prix, SKU, familles et stocks.",
      },
      { property: "og:title", content: "Catalogue produits — BSS POS" },
      { property: "og:description", content: "Tout votre catalogue électronique en un écran." },
    ],
  }),
  component: CataloguePage,
});

function CataloguePage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ["catalogue", debounced],
    queryFn: () => fetchOrDemo<Product[]>("/commerce/products", demoProducts, { search: debounced }),
    staleTime: 30_000,
  });

  const rows = (data ?? []).filter(
    (p) =>
      !debounced ||
      p.name.toLowerCase().includes(debounced.toLowerCase()) ||
      p.sku.toLowerCase().includes(debounced.toLowerCase()),
  );

  return (
    <PageBody>
      <PageHeader
        title="Catalogue"
        description="Produits, variantes et lots de la boutique."
        action={
          <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
            <Plus className="size-4" aria-hidden />
            Nouveau produit
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
          placeholder="Rechercher un produit…"
          aria-label="Rechercher un produit"
          className="min-h-[44px] rounded-[10px] pl-10"
        />
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Famille</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">
                  {product.sku}
                </TableCell>
                <TableCell className="text-muted-foreground">{product.family}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(product.price)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    className={cn(
                      "tabular border-transparent text-[11px] font-semibold",
                      product.stock === 0
                        ? "bg-destructive/15 text-destructive"
                        : product.stock <= product.min_stock
                          ? "bg-warning/20 text-foreground"
                          : "bg-success/15 text-foreground",
                    )}
                  >
                    {product.stock}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" className="min-h-[44px] rounded-[10px]">
                    <Link to="/catalogue/$id" params={{ id: String(product.id) }}>
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
