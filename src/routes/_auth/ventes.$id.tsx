import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Printer, RotateCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";

import { PageBody, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatDateTime, formatXAF } from "@/lib/format";
import type { BackendSaleLine } from "@/lib/types";

export const Route = createFileRoute("/_auth/ventes/$id")({
  head: () => ({
    meta: [
      { title: "Détail vente — BSS POS" },
      { property: "og:title", content: "Détail vente — BSS POS" },
    ],
  }),
  component: SaleDetailPage,
});

interface BackendSaleDetail {
  id: string;
  number: string;
  state: "draft" | "confirmed" | "abandoned" | "quote";
  total_including_tax: number;
  total_excluding_tax: number;
  total_tax: number;
  created_at: string;
  confirmed_at: string | null;
  customer?: { id: string; name: string } | null;
  cash_session?: {
    id: string;
    opened_by?: { id: string; first_name: string; last_name: string } | null;
  } | null;
  lines?: BackendSaleLine[];
}

const STATE_LABEL: Record<string, string> = {
  confirmed: "Confirmée",
  abandoned: "Annulée",
  draft:     "Brouillon",
  quote:     "Devis",
};

const returnSchema = z.object({
  reason: z.string().min(1, "Motif requis"),
});

function SaleDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: () =>
      request<{ data: BackendSaleDetail }>(`/commerce/sales/${id}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const returnForm = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: { reason: "" },
  });

  const cancelSale = async () => {
    setCancelling(true);
    try {
      await request(`/commerce/sales/${id}/cancel`, { method: "PATCH" });
      toast.success("Vente annulée");
      void qc.invalidateQueries({ queryKey: ["sale", id] });
      void qc.invalidateQueries({ queryKey: ["ventes"] });
    } catch {
      toast.error("Impossible d'annuler cette vente");
    } finally {
      setCancelling(false);
    }
  };

  const onSubmitReturn = async (values: z.infer<typeof returnSchema>) => {
    try {
      await request(`/commerce/sales/${id}/returns`, {
        method: "POST",
        body: { reason: values.reason },
      });
      toast.success("Retour enregistré");
      void qc.invalidateQueries({ queryKey: ["sale", id] });
      void qc.invalidateQueries({ queryKey: ["ventes"] });
      returnForm.reset();
      setReturnOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          returnForm.setError(f as keyof z.infer<typeof returnSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors du retour");
      }
    }
  };

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-[16px]" />)}
        </div>
        <Skeleton className="h-48 rounded-[16px]" />
      </PageBody>
    );
  }

  if (!sale) return null;

  const lines = sale.lines ?? [];
  const sellerName = sale.cash_session?.opened_by
    ? `${sale.cash_session.opened_by.first_name} ${sale.cash_session.opened_by.last_name}`
    : "—";

  return (
    <PageBody>
      <PageHeader
        title={sale.number}
        description={`${formatDateTime(sale.created_at)} · ${sellerName}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => window.open(`/commerce/sales/${id}/receipt.pdf`, "_blank")}
            >
              <Printer className="size-4" aria-hidden />
              Imprimer
            </Button>
            {sale.state === "confirmed" && (
              <>
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-[10px]"
                  onClick={() => { returnForm.reset(); setReturnOpen(true); }}
                >
                  <Undo2 className="size-4" aria-hidden />
                  Retour
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-[10px] border-destructive text-destructive hover:bg-destructive/10"
                  disabled={cancelling}
                  onClick={() => void cancelSale()}
                >
                  {cancelling ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <RotateCcw className="size-4" aria-hidden />
                  )}
                  Annuler
                </Button>
              </>
            )}
          </div>
        }
      />

      <Link
        to="/ventes"
        className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux ventes
      </Link>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Client</p>
          <p className="font-semibold">{sale.customer?.name ?? "Client comptoir"}</p>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Montant total</p>
          <p className="tabular text-[22px] font-bold tracking-tight">
            {formatXAF(sale.total_including_tax)}
          </p>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Statut</p>
          <Badge
            className={
              sale.state === "abandoned"
                ? "w-fit border-transparent bg-destructive/15 text-[13px] font-semibold text-destructive"
                : "w-fit border-transparent bg-success/15 text-[13px] font-semibold text-foreground"
            }
          >
            {STATE_LABEL[sale.state] ?? sale.state}
          </Badge>
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
              <TableHead className="text-right">Remise</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.product?.label ?? l.designation}</TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">
                  {l.product?.reference ?? "—"}
                </TableCell>
                <TableCell className="tabular text-right">{l.quantity}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(l.unit_price)}</TableCell>
                <TableCell className="tabular text-right text-muted-foreground">
                  {l.discount_percent > 0 ? `-${l.discount_percent}%` : "—"}
                </TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {formatXAF(l.line_total_including_tax)}
                </TableCell>
              </TableRow>
            ))}
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucune ligne de vente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end">
        <Card className="w-full max-w-xs gap-2 rounded-[16px] border-border p-5 shadow-none">
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">Sous-total HT</span>
            <span className="tabular">{formatXAF(sale.total_excluding_tax)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-muted-foreground">TVA</span>
            <span className="tabular">{formatXAF(sale.total_tax)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-[17px] font-bold">
            <span>Total TTC</span>
            <span className="tabular">{formatXAF(sale.total_including_tax)}</span>
          </div>
        </Card>
      </div>

      <Dialog open={returnOpen} onOpenChange={(v) => { setReturnOpen(v); if (!v) returnForm.reset(); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Créer un retour</DialogTitle>
            <DialogDescription>
              Un retour sera enregistré pour la vente <strong>{sale.number}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...returnForm}>
            <form onSubmit={returnForm.handleSubmit(onSubmitReturn)} className="flex flex-col gap-4">
              <FormField
                control={returnForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif du retour</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Produit défectueux, client insatisfait…"
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
                  disabled={returnForm.formState.isSubmitting}
                >
                  {returnForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Enregistrer le retour
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
