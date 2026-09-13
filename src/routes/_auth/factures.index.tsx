import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, request } from "@/lib/api";
import { adaptCustomers, adaptInvoices } from "@/lib/adapters";
import { formatDate, formatXAF } from "@/lib/format";
import type { BackendCustomer, BackendInvoice, Customer, Invoice } from "@/lib/types";

export const Route = createFileRoute("/_auth/factures/")({
  head: () => ({
    meta: [
      { title: "Factures B2B — BSS POS" },
      {
        name: "description",
        content: "Suivez vos factures professionnelles, règlements partiels et soldes dus.",
      },
      { property: "og:title", content: "Factures B2B — BSS POS" },
      { property: "og:description", content: "Facturation entreprise et suivi des encaissements." },
    ],
  }),
  component: InvoicesPage,
});

function PdfDownloadButton({ invoiceId, number }: { invoiceId: string; number: string }) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/commerce/invoices/${invoiceId}/invoice.pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(resp.data as Blob);
      const a   = document.createElement("a");
      a.href = url;
      a.download = `${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("PDF non disponible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="min-h-[44px] flex-1 rounded-[10px]"
      disabled={loading}
      onClick={() => void download()}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Download className="size-4" aria-hidden />
      )}
      PDF
    </Button>
  );
}

const TVA = 0.1925;

const statusConfig: Record<Invoice["status"], { label: string; className: string }> = {
  brouillon: {
    label: "Brouillon",
    className: "border-transparent bg-muted text-[11px] font-semibold text-foreground",
  },
  envoyee: {
    label: "Envoyée",
    className: "border-transparent bg-primary/15 text-[11px] font-semibold text-primary",
  },
  partielle: {
    label: "Partielle",
    className: "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground",
  },
  payee: {
    label: "Payée",
    className: "border-transparent bg-success/15 text-[11px] font-semibold text-foreground",
  },
  en_retard: {
    label: "En retard",
    className: "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive",
  },
};

const schema = z.object({
  client_id:  z.string().min(1, "Client requis"),
  total_ht:   z.coerce.number().int("Entier XAF").min(1, "Montant HT requis"),
  total_vat:  z.coerce.number().int("Entier XAF").min(0),
  total_ttc:  z.coerce.number().int("Entier XAF").min(1, "Montant TTC requis"),
  due_date:   z.string().optional(),
  notes:      z.string().optional(),
});

function InvoicesPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () =>
      request<{ data: BackendInvoice[] }>("/commerce/invoices")
        .then((r) => adaptInvoices(r.data))
        .catch(() => [] as Invoice[]),
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
      total_ht: 0,
      total_vat: 0,
      total_ttc: 0,
      due_date: "",
      notes: "",
    },
  });

  const watchHt = Number(form.watch("total_ht")) || 0;
  const autoVat = Math.round(watchHt * TVA);
  const autoTtc = watchHt + autoVat;

  const applyAutoCalc = () => {
    form.setValue("total_vat", autoVat);
    form.setValue("total_ttc", autoTtc);
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/commerce/invoices", {
        method: "POST",
        body: {
          client_id: values.client_id,
          total_ht:  values.total_ht,
          total_vat: values.total_vat,
          total_ttc: values.total_ttc,
          ...(values.due_date  ? { due_date: values.due_date } : {}),
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        },
      });
      toast.success("Facture créée");
      void qc.invalidateQueries({ queryKey: ["invoices"] });
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
        title="Factures B2B"
        description="Factures professionnelles et suivi des règlements."
        action={
          <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <SheetTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouvelle facture
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[500px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Nouvelle facture B2B</SheetTitle>
                <SheetDescription>Créez une facture manuelle pour un client professionnel.</SheetDescription>
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
                    name="total_ht"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant HT (XAF)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              className="tabular min-h-[44px] rounded-[10px]"
                              {...field}
                            />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px] shrink-0 rounded-[10px] px-3 text-[12px]"
                            onClick={applyAutoCalc}
                          >
                            TVA 19,25%
                          </Button>
                        </div>
                        <FormDescription>
                          {watchHt > 0 && `TVA calculée : ${formatXAF(autoVat)} → TTC : ${formatXAF(autoTtc)}`}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="total_vat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TVA (XAF)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" min="0" className="tabular min-h-[44px] rounded-[10px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_ttc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total TTC (XAF)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" min="1" className="tabular min-h-[44px] rounded-[10px] font-semibold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'échéance (optionnel)</FormLabel>
                        <FormControl>
                          <Input type="date" className="min-h-[44px] rounded-[10px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} className="rounded-[10px]" placeholder="Conditions, références…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="mt-auto min-h-[44px] w-full rounded-[10px]"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Créer la facture
                  </Button>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {invoices.map((invoice) => {
          const ratio = invoice.total > 0 ? Math.round((invoice.paid / invoice.total) * 100) : 0;
          const cfg = statusConfig[invoice.status] ?? statusConfig.brouillon;
          return (
            <Card key={invoice.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="mono text-[12px] text-muted-foreground">{invoice.number}</p>
                  <h2 className="truncate text-[17px] font-semibold">{invoice.customer}</h2>
                  <p className="text-[12px] text-muted-foreground">
                    Émise le {formatDate(invoice.issued_at)}
                    {invoice.due_date && ` · Échéance ${formatDate(invoice.due_date)}`}
                  </p>
                </div>
                <Badge className={cfg.className}>{cfg.label}</Badge>
              </div>

              <Progress value={ratio} className="mt-4 h-2" />
              <div className="mt-2 flex items-center justify-between text-[13px]">
                <span className="tabular text-muted-foreground">
                  Réglé {formatXAF(invoice.paid)} / {formatXAF(invoice.total)}
                </span>
                <span className="tabular font-semibold">
                  Solde {formatXAF(invoice.outstanding)}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <PdfDownloadButton invoiceId={String(invoice.id)} number={invoice.number} />
                <Link to="/factures/$id" params={{ id: String(invoice.id) }} className="flex-1">
                  <Button className="min-h-[44px] w-full rounded-[10px]">Voir détail</Button>
                </Link>
              </div>
            </Card>
          );
        })}

        {invoices.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Aucune facture — créez votre première facture B2B.
          </p>
        )}
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Total TTC</TableHead>
              <TableHead className="text-right">Réglé</TableHead>
              <TableHead className="text-right">Solde</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((i) => {
              const cfg = statusConfig[i.status] ?? statusConfig.brouillon;
              return (
                <TableRow
                  key={i.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => void (window.location.href = `/factures/${i.id}`)}
                >
                  <TableCell className="mono text-[12px]">{i.number}</TableCell>
                  <TableCell className="font-medium">{i.customer}</TableCell>
                  <TableCell className="tabular text-[13px] text-muted-foreground">
                    {i.due_date ? formatDate(i.due_date) : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatXAF(i.total)}</TableCell>
                  <TableCell className="tabular text-right text-success">{formatXAF(i.paid)}</TableCell>
                  <TableCell className="tabular text-right font-semibold">
                    {formatXAF(i.outstanding)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className={cfg.className}>{cfg.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
