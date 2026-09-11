import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatInt } from "@/lib/format";
import { adaptStockLevels } from "@/lib/adapters";
import { usePointOfSale } from "@/hooks/use-point-of-sale";
import type { BackendProduct, BackendStockLevel, StockLevel, StockMovement } from "@/lib/types";

export const Route = createFileRoute("/_auth/stock")({
  head: () => ({
    meta: [
      { title: "Stock & alertes — BSS POS" },
      {
        name: "description",
        content: "Niveaux de stock, seuils d'alerte et historique des mouvements de la boutique.",
      },
      { property: "og:title", content: "Stock & alertes — BSS POS" },
      { property: "og:description", content: "Surveillez ruptures et niveaux de stock en temps réel." },
    ],
  }),
  component: StockPage,
});

interface PointOfSale { id: string; name: string; }

const thresholdSchema = z.object({
  product_id:       z.string().min(1, "Produit requis"),
  point_of_sale_id: z.string().min(1, "PDV requis"),
  minimum_quantity: z.coerce.number().int().min(0, "Minimum 0"),
});

function StockPage() {
  const qc = useQueryClient();
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const { pos } = usePointOfSale();
  const posId = pos?.id;

  // Niveaux de stock réels depuis /commerce/stock
  const { data: stockLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["stock", posId],
    queryFn: () =>
      request<{ data: BackendStockLevel[] }>(
        "/commerce/stock",
        posId ? { params: { point_of_sale_id: posId } } : {},
      ).then((r) => adaptStockLevels(r.data)),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Alertes depuis le backend (/stock/alerts filtre déjà quantity < minimum_quantity)
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["stock-alerts", posId],
    queryFn: () =>
      request<{ data: BackendStockLevel[] }>(
        "/commerce/stock/alerts",
        posId ? { params: { point_of_sale_id: posId } } : {},
      ).then((r) => adaptStockLevels(r.data)),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Mouvements de stock
  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", posId],
    queryFn: () =>
      request<{ data: StockMovement[] }>(
        "/commerce/stock/movements",
        posId ? { params: { point_of_sale_id: posId } } : {},
      )
        .then((r) => r.data)
        .catch(() => [] as StockMovement[]),
    staleTime: 30_000,
  });

  // Points de vente pour le dialog seuil
  const { data: posList = [] } = useQuery({
    queryKey: ["points-of-sale"],
    queryFn: () =>
      request<{ data: PointOfSale[] }>("/commerce/points-of-sale").then((r) => r.data),
    staleTime: 60_000,
  });

  // Produits pour le sélecteur du dialog seuil (liste plate)
  const { data: productList = [] } = useQuery({
    queryKey: ["products-all"],
    queryFn: () =>
      request<{ data: BackendProduct[] }>("/commerce/products").then((r) => r.data),
    staleTime: 60_000,
  });

  const thresholdForm = useForm<z.infer<typeof thresholdSchema>>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: { product_id: "", point_of_sale_id: "", minimum_quantity: 5 },
  });

  const onSubmitThreshold = async (values: z.infer<typeof thresholdSchema>) => {
    try {
      await request("/commerce/stock/thresholds", { method: "POST", body: values });
      toast.success("Seuil d'alerte mis à jour");
      void qc.invalidateQueries({ queryKey: ["stock", posId] });
      void qc.invalidateQueries({ queryKey: ["stock-alerts", posId] });
      thresholdForm.reset();
      setThresholdOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          thresholdForm.setError(f as keyof z.infer<typeof thresholdSchema>, {
            message: msgs[0] ?? "Invalide",
          }),
        );
      } else {
        toast.error(e?.message ?? "Erreur");
      }
    }
  };

  const exportCsv = (rows: StockLevel[], filename: string) => {
    const csv = [
      "produit;sku;pdv;stock;seuil",
      ...rows.map(
        (r) =>
          `${r.product_name};${r.product_sku};${r.pos_name};${r.quantity};${r.minimum_quantity}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageBody>
      <PageHeader
        title="Stock"
        description={`${pos ? pos.name + " · " : ""}${stockLevels.length} ligne(s) · ${alerts.length} alerte(s)`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => { thresholdForm.reset(); setThresholdOpen(true); }}
            >
              <Bell className="size-4" aria-hidden />
              Seuil d'alerte
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => exportCsv(stockLevels, "stock.csv")}
            >
              <Download className="size-4" aria-hidden />
              Export CSV
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="niveaux">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="niveaux" className="min-h-[36px]">
            Niveaux
          </TabsTrigger>
          <TabsTrigger value="alertes" className="min-h-[36px]">
            Alertes
            {alerts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                {alerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mouvements" className="min-h-[36px]">
            Mouvements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="niveaux" className="pt-4">
          <StockTable rows={stockLevels} loading={levelsLoading} />
        </TabsContent>

        <TabsContent value="alertes" className="pt-4">
          <StockTable rows={alerts} loading={alertsLoading} emptyMessage="Aucune alerte — tous les stocks sont au-dessus des seuils." />
        </TabsContent>

        <TabsContent value="mouvements" className="pt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.product}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{m.type}</TableCell>
                      <TableCell
                        className={cn(
                          "tabular text-right",
                          m.qty < 0 ? "text-destructive" : "text-success",
                        )}
                      >
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.reason}</TableCell>
                      <TableCell className="tabular text-right">
                        {formatDateTime(m.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog seuil d'alerte */}
      <Dialog
        open={thresholdOpen}
        onOpenChange={(v) => { setThresholdOpen(v); if (!v) thresholdForm.reset(); }}
      >
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Définir un seuil d'alerte</DialogTitle>
            <DialogDescription>
              Le système signalera ce produit quand son stock sera inférieur au seuil.
            </DialogDescription>
          </DialogHeader>
          <Form {...thresholdForm}>
            <form onSubmit={thresholdForm.handleSubmit(onSubmitThreshold)} className="flex flex-col gap-4">
              <FormField
                control={thresholdForm.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] rounded-[10px]">
                          <SelectValue placeholder="Choisir un produit…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productList.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={thresholdForm.control}
                name="point_of_sale_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Point de vente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] rounded-[10px]">
                          <SelectValue placeholder="Choisir un PDV…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {posList.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={thresholdForm.control}
                name="minimum_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil minimum (unités)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        className="tabular min-h-[44px] rounded-[10px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  className="min-h-[44px] rounded-[10px] px-6"
                  disabled={thresholdForm.formState.isSubmitting}
                >
                  {thresholdForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Enregistrer le seuil
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}

function StockTable({
  rows,
  loading,
  emptyMessage = "Aucun produit concerné.",
}: {
  rows: StockLevel[];
  loading: boolean;
  emptyMessage?: string;
}) {
  return (
    <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>Produit</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Point de vente</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Seuil</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                Chargement…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        r.quantity === 0
                          ? "bg-destructive"
                          : r.quantity <= r.minimum_quantity
                            ? "bg-warning"
                            : "bg-success",
                      )}
                    />
                    {r.product_name}
                  </span>
                </TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">
                  {r.product_sku}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.pos_name}</TableCell>
                <TableCell className="tabular text-right">{formatInt(r.quantity)}</TableCell>
                <TableCell className="tabular text-right text-muted-foreground">
                  {formatInt(r.minimum_quantity)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
