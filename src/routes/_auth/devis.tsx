import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CalendarClock, Loader2, Package, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FormDescription,
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
import { adaptCustomers, adaptQuotes, type Quote } from "@/lib/adapters";
import { formatDate, formatXAF } from "@/lib/format";
import { useCashSession } from "@/hooks/use-cash-session";
import type { BackendCustomer, BackendQuote, Customer } from "@/lib/types";

export const Route = createFileRoute("/_auth/devis")({
  head: () => ({
    meta: [
      { title: "Devis — BSS POS" },
      {
        name: "description",
        content: "Créez des devis clients et convertissez-les en ventes en un clic.",
      },
      { property: "og:title", content: "Devis — BSS POS" },
      { property: "og:description", content: "Du devis à la vente sans ressaisie." },
    ],
  }),
  component: QuotesPage,
});

const schema = z.object({
  client_id: z.string().min(1, "Client requis"),
  valid_until: z.string().min(1, "Date de validité requise"),
});

const statusConfig = {
  en_attente: {
    label: "En attente",
    className: "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground",
  },
  expire: {
    label: "Expiré",
    className: "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive",
  },
  converti: {
    label: "Converti",
    className: "border-transparent bg-success/15 text-[11px] font-semibold text-foreground",
  },
} as const;

function QuotesPage() {
  const [open, setOpen] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const qc = useQueryClient();
  const { session } = useCashSession();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () =>
      request<{ data: BackendQuote[] }>("/commerce/quotes")
        .then((r) => adaptQuotes(r.data))
        .catch(() => [] as Quote[]),
    staleTime: 30_000,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () =>
      request<{ data: BackendCustomer[] }>("/commerce/customers")
        .then((r) => adaptCustomers(r.data))
        .catch(() => [] as Customer[]),
    staleTime: 60_000,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: "",
      valid_until: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/commerce/quotes", {
        method: "POST",
        body: {
          client_id: values.client_id,
          valid_until: values.valid_until,
        },
      });
      toast.success("Devis créé — ajoutez les produits depuis le POS");
      void qc.invalidateQueries({ queryKey: ["quotes"] });
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

  const convertQuote = async (id: string) => {
    if (!session) {
      toast.error("Aucune session caisse active — ouvrez une session dans le POS avant de convertir.");
      return;
    }
    setConverting(id);
    try {
      await request(`/commerce/quotes/${id}/convert`, {
        method: "PATCH",
        body: { cash_session_id: session.id },
      });
      toast.success("Devis converti en vente — confirmez l'encaissement dans le POS");
      void qc.invalidateQueries({ queryKey: ["quotes"] });
      void qc.invalidateQueries({ queryKey: ["sales"] });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible de convertir le devis");
    } finally {
      setConverting(null);
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Devis"
        description="Propositions commerciales en attente de conversion."
        action={
          <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <SheetTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouveau devis
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[440px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Nouveau devis</SheetTitle>
                <SheetDescription>
                  Créez un devis pour un client. Ajoutez les produits depuis le POS ensuite.
                </SheetDescription>
              </SheetHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-1 flex-col gap-4 overflow-y-auto px-1"
                >
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="min-h-[44px] rounded-[10px]">
                              <SelectValue placeholder="Choisir un client…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                                {c.phone && (
                                  <span className="ml-2 text-[12px] text-muted-foreground">
                                    {c.phone}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valid_until"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valide jusqu'au</FormLabel>
                        <FormControl>
                          <Input type="date" className="min-h-[44px] rounded-[10px]" {...field} />
                        </FormControl>
                        <FormDescription>
                          Le devis expire automatiquement après cette date.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Info flow */}
                  <div className="rounded-[12px] border border-border bg-muted/40 p-4 text-[13px] text-muted-foreground">
                    <p className="mb-2 font-medium text-foreground">Flux de création :</p>
                    <ol className="flex flex-col gap-1.5">
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</span>
                        Créer le devis (client + validité)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted-foreground/30 text-[10px] font-bold">2</span>
                        Ouvrir le POS → ajouter les articles
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted-foreground/30 text-[10px] font-bold">3</span>
                        Revenir ici → Convertir en vente
                      </li>
                    </ol>
                  </div>

                  <Button
                    type="submit"
                    className="mt-auto min-h-[44px] w-full rounded-[10px]"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    Créer le devis
                  </Button>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        }
      />

      {/* Alerte session manquante */}
      {!session && (
        <div className="flex items-center gap-3 rounded-[12px] border border-warning/30 bg-warning/10 px-4 py-3">
          <CalendarClock className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="text-[13px] text-foreground">
            <span className="font-semibold">Aucune session caisse ouverte.</span>{" "}
            Ouvrez une session dans le POS avant de convertir un devis.
          </p>
        </div>
      )}

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Articles</TableHead>
              <TableHead>Validité</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="mono text-[12px]">{q.reference}</TableCell>
                <TableCell className="font-medium">{q.customer ?? "—"}</TableCell>
                <TableCell className="tabular text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Package className="size-3.5 text-muted-foreground" aria-hidden />
                    {q.lines_count}
                  </span>
                </TableCell>
                <TableCell className="tabular">
                  {q.valid_until ? formatDate(q.valid_until) : "—"}
                </TableCell>
                <TableCell className="tabular text-right">
                  {q.total > 0 ? formatXAF(q.total) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge className={statusConfig[q.status].className}>
                    {statusConfig[q.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] rounded-[10px]"
                    disabled={
                      q.status !== "en_attente" ||
                      converting === String(q.id) ||
                      !session
                    }
                    onClick={() => void convertQuote(String(q.id))}
                    title={!session ? "Session caisse requise" : undefined}
                  >
                    {converting === String(q.id) ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ArrowRight className="size-4" aria-hidden />
                    )}
                    Convertir
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && quotes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucun devis — créez votre première proposition commerciale.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
