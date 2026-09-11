import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, Loader2, Minus, Plus, Send, Truck } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { request } from "@/lib/api";
import { adaptTransfers, adaptProducts } from "@/lib/adapters";
import { formatDate, formatInt } from "@/lib/format";
import type { BackendProduct, BackendTransfer, Product, Transfer } from "@/lib/types";

export const Route = createFileRoute("/_auth/transferts")({
  head: () => ({
    meta: [
      { title: "Transferts inter-boutiques — BSS POS" },
      {
        name: "description",
        content: "Suivez les transferts de stock entre vos boutiques.",
      },
      { property: "og:title", content: "Transferts inter-boutiques — BSS POS" },
      { property: "og:description", content: "Déplacez votre stock entre points de vente." },
    ],
  }),
  component: TransfersPage,
});

interface PointOfSale {
  id: string;
  name: string;
  organizational_unit?: { name: string };
}

const STATUS_BADGE: Record<string, string> = {
  pending:    "border-transparent bg-muted text-[11px] font-semibold text-foreground",
  in_transit: "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground",
  received:   "border-transparent bg-success/15 text-[11px] font-semibold text-foreground",
  cancelled:  "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive",
};

const schema = z.object({
  source_pos_id:      z.string().min(1, "Point de départ requis"),
  destination_pos_id: z.string().min(1, "Destination requise"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    product_id: z.string().min(1, "Produit requis"),
    quantity:   z.coerce.number().int().min(1, "Qté min. 1"),
  })).min(1, "Au moins 1 article requis"),
});

function TransfersPage() {
  const [open, setOpen] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [receiving,   setReceiving]   = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn:  () =>
      request<{ data: BackendTransfer[] }>("/commerce/transfers")
        .then((r) => adaptTransfers(r.data))
        .catch(() => [] as Transfer[]),
    staleTime: 30_000,
  });

  const { data: posList = [] } = useQuery({
    queryKey: ["points-of-sale"],
    queryFn:  () =>
      request<{ data: PointOfSale[] }>("/commerce/points-of-sale")
        .then((r) => r.data)
        .catch(() => [] as PointOfSale[]),
    staleTime: 60_000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn:  () =>
      request<{ data: BackendProduct[] }>("/commerce/products")
        .then((r) => adaptProducts(r.data))
        .catch(() => [] as Product[]),
    staleTime: 60_000,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      source_pos_id:      "",
      destination_pos_id: "",
      notes:              "",
      lines:              [{ product_id: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/commerce/transfers", {
        method: "POST",
        body: {
          source_pos_id:      values.source_pos_id,
          destination_pos_id: values.destination_pos_id,
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
          lines: values.lines.map((l) => ({
            product_id: l.product_id,
            quantity:   l.quantity,
          })),
        },
      });
      toast.success("Transfert créé");
      void qc.invalidateQueries({ queryKey: ["transfers"] });
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

  const dispatch = async (id: string) => {
    setDispatching(id);
    try {
      await request(`/commerce/transfers/${id}/dispatch`, { method: "PATCH" });
      toast.success("Transfert expédié — statut : En transit");
      void qc.invalidateQueries({ queryKey: ["transfers"] });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible d'expédier");
    } finally {
      setDispatching(null);
    }
  };

  const receive = async (id: string) => {
    setReceiving(id);
    try {
      await request(`/commerce/transfers/${id}/receive`, { method: "PATCH" });
      toast.success("Transfert réceptionné — stock mis à jour");
      void qc.invalidateQueries({ queryKey: ["transfers"] });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible de réceptionner");
    } finally {
      setReceiving(null);
    }
  };

  const posName = (id: string) =>
    posList.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <PageBody>
      <PageHeader
        title="Transferts"
        description="Mouvements de stock entre boutiques."
        action={
          <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <SheetTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouveau transfert
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[520px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Nouveau transfert</SheetTitle>
                <SheetDescription>
                  Sélectionnez les points de vente et les articles à transférer.
                </SheetDescription>
              </SheetHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
                  {/* Source + Destination */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="source_pos_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point de départ</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="min-h-[44px] rounded-[10px]">
                              <SelectValue placeholder="Choisir…" />
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
                    )} />

                    <FormField control={form.control} name="destination_pos_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="min-h-[44px] rounded-[10px]">
                              <SelectValue placeholder="Choisir…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {posList.filter((p) => p.id !== form.watch("source_pos_id")).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Separator />

                  {/* Lignes produits */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-semibold">Articles à transférer</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[36px] rounded-[8px]"
                        onClick={() => append({ product_id: "", quantity: 1 })}
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Ajouter
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_80px_36px] items-end gap-2">
                        <FormField control={form.control} name={`lines.${index}.product_id`} render={({ field: f }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Produit</FormLabel>}
                            <Select value={f.value} onValueChange={f.onChange}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px] rounded-[10px]">
                                  <SelectValue placeholder="Choisir…" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name={`lines.${index}.quantity`} render={({ field: f }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Qté</FormLabel>}
                            <FormControl>
                              <Input type="number" step="1" min="1" className="tabular min-h-[44px] rounded-[10px]" {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[36px] text-muted-foreground hover:text-destructive"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                          aria-label="Retirer la ligne"
                        >
                          <Minus className="size-4" aria-hidden />
                        </Button>
                      </div>
                    ))}

                    {form.formState.errors.lines?.root && (
                      <p className="text-[12px] text-destructive">{form.formState.errors.lines.root.message}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Notes */}
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea rows={2} className="rounded-[10px]" placeholder="Motif du transfert…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" className="mt-auto min-h-[44px] w-full rounded-[10px]" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Créer le transfert
                  </Button>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {transfers.map((t) => (
          <Card key={t.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="mono text-[12px] text-muted-foreground">{t.reference}</p>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-[15px] font-semibold">
                  <span className="truncate">{t.from}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{t.to}</span>
                </div>
                <p className="tabular mt-1 text-[12px] text-muted-foreground">
                  {t.items > 0 ? `${formatInt(t.items)} article(s)` : "—"} · {formatDate(t.created_at)}
                </p>
                {t.notes && (
                  <p className="mt-1 text-[12px] text-muted-foreground italic line-clamp-1">{t.notes}</p>
                )}
              </div>
              <Badge className={STATUS_BADGE[t.status] ?? STATUS_BADGE["pending"]}>
                {t.status_label}
              </Badge>
            </div>

            {t.status === "received" || t.status === "cancelled" ? (
              <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-border bg-muted/30 px-4 py-3 text-[13px] text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {t.status === "received" ? "Transfert réceptionné — stock mis à jour" : "Transfert annulé"}
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                {/* Expédier (pending → in_transit) */}
                <Button
                  variant="outline"
                  className="min-h-[44px] flex-1 rounded-[10px]"
                  disabled={t.status !== "pending" || dispatching === t.id}
                  onClick={() => void dispatch(t.id)}
                >
                  {dispatching === t.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  Expédier
                </Button>

                {/* Réceptionner (in_transit → received) */}
                <Button
                  className="min-h-[44px] flex-1 rounded-[10px]"
                  disabled={t.status !== "in_transit" || receiving === t.id}
                  onClick={() => void receive(t.id)}
                >
                  {receiving === t.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-4" aria-hidden />
                  )}
                  Réceptionner
                </Button>
              </div>
            )}
          </Card>
        ))}

        {transfers.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-12 text-center">
            <Truck className="size-10 text-muted-foreground" aria-hidden />
            <p className="text-[15px] font-medium">Aucun transfert</p>
            <p className="text-[13px] text-muted-foreground">
              Créez votre premier transfert pour déplacer du stock entre boutiques.
            </p>
          </div>
        )}
      </div>
    </PageBody>
  );
}
