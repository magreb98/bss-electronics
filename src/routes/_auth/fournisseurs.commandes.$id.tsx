import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { request } from "@/lib/api";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/fournisseurs/commandes/$id")({
  head: () => ({
    meta: [
      { title: "Détail commande — BSS POS" },
      { property: "og:title", content: "Détail commande — BSS POS" },
    ],
  }),
  component: OrderDetailPage,
});

interface OrderLine {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  product?: { label: string; reference: string };
}

interface SupplierOrder {
  id: string;
  status: "draft" | "sent" | "received";
  ordered_at: string;
  supplier?: { id: string; name: string };
  lines?: OrderLine[];
}

interface PointOfSale { id: string; name: string; }

const receiveSchema = z.object({
  point_of_sale_id: z.string().min(1, "PDV requis"),
});

const STATUS_LABEL: Record<string, string> = {
  draft:    "Brouillon",
  sent:     "Envoyée",
  received: "Reçue",
};
const STATUS_BADGE: Record<string, string> = {
  draft:    "border-transparent bg-muted text-[11px] font-semibold text-foreground",
  sent:     "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground",
  received: "border-transparent bg-success/15 text-[11px] font-semibold text-foreground",
};

function OrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["supplier-order", id],
    queryFn: () =>
      request<{ data: SupplierOrder }>(`/commerce/supplier-orders/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 30_000,
  });

  const { data: posList = [] } = useQuery({
    queryKey: ["points-of-sale"],
    queryFn: () =>
      request<{ data: PointOfSale[] }>("/commerce/points-of-sale")
        .then((r) => r.data)
        .catch(() => [] as PointOfSale[]),
    staleTime: 60_000,
  });

  const totalTTC = (order?.lines ?? []).reduce((s, l) => s + l.unit_cost * l.quantity, 0);

  const form = useForm<z.infer<typeof receiveSchema>>({
    resolver: zodResolver(receiveSchema),
    defaultValues: { point_of_sale_id: "" },
  });

  const onSubmitReceive = async (values: z.infer<typeof receiveSchema>) => {
    try {
      const lines = (order?.lines ?? []).map((l) => ({
        product_id:        l.product_id,
        quantity_expected: l.quantity,
        quantity_received: l.quantity,
        unit_cost:         l.unit_cost,
      }));

      await request(`/commerce/supplier-orders/${id}/receptions`, {
        method: "POST",
        body: {
          point_of_sale_id: values.point_of_sale_id,
          lines,
        },
      });
      toast.success("Réception enregistrée — stock mis à jour");
      void qc.invalidateQueries({ queryKey: ["supplier-order", id] });
      void qc.invalidateQueries({ queryKey: ["supplier-orders"] });
      setReceiveOpen(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Erreur lors de la réception");
    }
  };

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-20 rounded-[16px]" />)}
        </div>
        <Skeleton className="h-48 rounded-[16px]" />
      </PageBody>
    );
  }

  if (!order) {
    return (
      <PageBody>
        <Link to="/fournisseurs" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour aux fournisseurs
        </Link>
        <p className="py-8 text-center text-muted-foreground">Commande introuvable.</p>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={`Commande ${order.id.slice(0, 8).toUpperCase()}`}
        description={`${order.supplier?.name ?? "—"} · commandée le ${formatDate(order.ordered_at)}`}
        action={
          order.status !== "received" && (
            <Button
              className="min-h-[44px] rounded-[10px] px-5"
              onClick={() => { form.reset(); setReceiveOpen(true); }}
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Réceptionner
            </Button>
          )
        }
      />

      <Link to="/fournisseurs" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux fournisseurs
      </Link>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Statut</p>
          <Badge className={`${STATUS_BADGE[order.status] ?? ""} text-[13px] w-fit`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Articles</p>
          <p className="tabular text-[22px] font-bold tracking-tight">
            {(order.lines ?? []).reduce((s, l) => s + l.quantity, 0)}
          </p>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Total coût</p>
          <p className="tabular text-[22px] font-bold tracking-tight">{formatXAF(totalTTC)}</p>
        </Card>
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="text-right">Prix unit.</TableHead>
              <TableHead className="text-right">Sous-total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(order.lines ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.product?.label ?? "—"}</TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">{l.product?.reference ?? "—"}</TableCell>
                <TableCell className="tabular text-right">{l.quantity}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(l.unit_cost)}</TableCell>
                <TableCell className="tabular text-right font-semibold">{formatXAF(l.unit_cost * l.quantity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog réception */}
      <Dialog open={receiveOpen} onOpenChange={(v) => { setReceiveOpen(v); if (!v) form.reset(); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Réceptionner la commande</DialogTitle>
            <DialogDescription>
              Sélectionnez le point de vente de destination. Toutes les quantités commandées seront réceptionnées.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReceive)} className="flex flex-col gap-4">
              <FormField control={form.control} name="point_of_sale_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Point de vente de destination</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-[44px] rounded-[10px]">
                        <SelectValue placeholder="Choisir un PDV…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {posList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Récap lignes */}
              <div className="rounded-[10px] border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead className="text-right">Qté reçue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.lines ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-[13px]">{l.product?.label ?? l.product_id.slice(0,8)}</TableCell>
                        <TableCell className="tabular text-right text-[13px]">{l.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={form.formState.isSubmitting || posList.length === 0}>
                  {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Confirmer la réception
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
