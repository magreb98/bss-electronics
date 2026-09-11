import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Package, PenLine } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { request } from "@/lib/api";
import { formatDate, formatXAF } from "@/lib/format";
import type { Supplier } from "@/lib/types";

export const Route = createFileRoute("/_auth/fournisseurs/$id")({
  head: () => ({
    meta: [
      { title: "Fiche fournisseur — BSS POS" },
      { property: "og:title", content: "Fiche fournisseur — BSS POS" },
    ],
  }),
  component: SupplierDetailPage,
});

interface SupplierOrder {
  id: string;
  status: "draft" | "sent" | "received";
  ordered_at: string;
  supplier?: { name: string };
  lines?: { quantity: number; unit_cost: number }[];
}

// Backend: seul `name` est persisté.
const editSchema = z.object({
  name: z.string().min(2, "Nom requis"),
});

const STATUS_LABEL: Record<string, string> = {
  draft:    "Brouillon",
  sent:     "Envoyée",
  received: "Reçue",
};

function SupplierDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () =>
      request<{ data: Supplier }>(`/commerce/suppliers/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 60_000,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["supplier-orders", id],
    queryFn: () =>
      request<{ data: SupplierOrder[] }>(`/commerce/supplier-orders?supplier_id=${id}`)
        .then((r) => r.data)
        .catch(() => [] as SupplierOrder[]),
    staleTime: 30_000,
  });

  const totalOrders   = orders.length;
  const totalCommandé = orders.reduce(
    (s, o) => s + (o.lines ?? []).reduce((ls, l) => ls + l.unit_cost * l.quantity, 0),
    0,
  );

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: supplier?.name ?? "" },
  });

  const openEdit = () => {
    form.reset({ name: supplier?.name ?? "" });
    setEditOpen(true);
  };

  const onSubmitEdit = async (values: z.infer<typeof editSchema>) => {
    try {
      await request(`/commerce/suppliers/${id}`, {
        method: "PATCH",
        body: { name: values.name },
      });
      toast.success("Fournisseur mis à jour");
      void qc.invalidateQueries({ queryKey: ["supplier", id] });
      void qc.invalidateQueries({ queryKey: ["suppliers"] });
      setEditOpen(false);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  if (loadingSupplier) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-[16px]" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-[16px]" />
      </PageBody>
    );
  }

  if (!supplier) {
    return (
      <PageBody>
        <Link to="/fournisseurs" className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour aux fournisseurs
        </Link>
        <p className="py-8 text-center text-muted-foreground">Fournisseur introuvable.</p>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={supplier.name}
        description={supplier.active ? "Fournisseur actif" : "Fournisseur inactif"}
        action={
          <Button variant="outline" className="min-h-[44px] rounded-[10px]" onClick={openEdit}>
            <PenLine className="size-4" aria-hidden />
            Modifier
          </Button>
        }
      />

      <Link
        to="/fournisseurs"
        className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux fournisseurs
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Commandes</p>
          <p className="tabular text-[22px] font-bold tracking-tight">{totalOrders}</p>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Total commandé</p>
          <p className="tabular text-[22px] font-bold tracking-tight">{formatXAF(totalCommandé)}</p>
        </Card>
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <div className="flex items-center justify-between p-5 pb-0">
          <p className="text-[17px] font-semibold tracking-tight">Commandes</p>
          <Button className="min-h-[44px] rounded-[10px] px-4" disabled>
            <Package className="size-4" aria-hidden />
            Nouvelle commande
          </Button>
        </div>

        {loadingOrders ? (
          <div className="p-5">
            <Skeleton className="h-24 w-full rounded" />
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="mono text-[12px]">
                    {o.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {formatDate(o.ordered_at)}
                  </TableCell>
                  <TableCell className="tabular text-right font-semibold">
                    {formatXAF((o.lines ?? []).reduce((s, l) => s + l.unit_cost * l.quantity, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        o.status === "received"
                          ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                          : o.status === "sent"
                            ? "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                            : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                      }
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aucune commande enregistrée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) form.reset(); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Modifier le fournisseur</DialogTitle>
            <DialogDescription>Mettez à jour le nom de {supplier.name}.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raison sociale</FormLabel>
                    <FormControl>
                      <Input className="min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  className="min-h-[44px] rounded-[10px] px-6"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
