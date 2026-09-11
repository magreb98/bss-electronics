import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { request } from "@/lib/api";
import { formatDate, formatXAF } from "@/lib/format";
import type { Supplier } from "@/lib/types";

export const Route = createFileRoute("/_auth/fournisseurs/")({
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

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
});

interface BackendSupplierOrder {
  id: string;
  supplier_id: string;
  status: "draft" | "sent" | "received";
  ordered_at: string;
  supplier?: { id: string; name: string };
  lines?: { product_id: string; quantity: number; unit_cost: number }[];
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  draft:    "Brouillon",
  sent:     "Envoyée",
  received: "Reçue",
};

function orderTotal(o: BackendSupplierOrder) {
  return (o.lines ?? []).reduce((s, l) => s + l.quantity * l.unit_cost, 0);
}

function SuppliersPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () =>
      request<{ data: Supplier[] }>("/commerce/suppliers").then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["supplier-orders-all"],
    queryFn: () =>
      request<{ data: BackendSupplierOrder[] }>("/commerce/supplier-orders").then((r) => r.data),
    staleTime: 30_000,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/commerce/suppliers", { method: "POST", body: { name: values.name } });
      toast.success("Fournisseur créé");
      void qc.invalidateQueries({ queryKey: ["suppliers"] });
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof schema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Fournisseurs"
        description="Partenaires d'approvisionnement et commandes en cours."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouveau fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[16px]">
              <DialogHeader>
                <DialogTitle>Nouveau fournisseur</DialogTitle>
                <DialogDescription>Enregistrez un partenaire d'approvisionnement.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raison sociale</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Tech Import Douala"
                            className="min-h-[44px] rounded-[10px]"
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
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      )}
                      Créer
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSuppliers ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Aucun fournisseur enregistré.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            s.active
                              ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                              : "border-transparent bg-muted text-[11px] font-semibold text-muted-foreground"
                          }
                        >
                          {s.active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" className="min-h-[44px] rounded-[10px]" asChild>
                          <Link to="/fournisseurs/$id" params={{ id: s.id }}>
                            Ouvrir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
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
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOrders ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Aucune commande enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="mono text-[12px]">
                        {o.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {o.supplier?.name ?? "—"}
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground">
                        {formatDate(o.ordered_at)}
                      </TableCell>
                      <TableCell className="tabular text-right font-semibold">
                        {formatXAF(orderTotal(o))}
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
                          {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}
