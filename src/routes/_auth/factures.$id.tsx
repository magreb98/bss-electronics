import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Building2,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Send,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageBody } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { api, request } from "@/lib/api";
import { adaptInvoice } from "@/lib/adapters";
import { formatDate, formatXAF } from "@/lib/format";
import type { BackendInvoice, Invoice } from "@/lib/types";

export const Route = createFileRoute("/_auth/factures/$id")({
  head: () => ({
    meta: [
      { title: "Détail facture — BSS POS" },
      { property: "og:title", content: "Détail facture — BSS POS" },
    ],
  }),
  component: InvoiceDetailPage,
});

// ── Configuration statuts ─────────────────────────────────────────────────────

const statusConfig: Record<Invoice["status"], { label: string; className: string; dot: string }> = {
  brouillon: {
    label: "Brouillon",
    className: "border-transparent bg-muted text-[12px] font-semibold text-foreground",
    dot: "bg-muted-foreground",
  },
  envoyee: {
    label: "Envoyée",
    className: "border-transparent bg-primary/15 text-[12px] font-semibold text-primary",
    dot: "bg-primary",
  },
  partielle: {
    label: "Partiellement réglée",
    className: "border-transparent bg-warning/20 text-[12px] font-semibold text-foreground",
    dot: "bg-warning",
  },
  payee: {
    label: "Payée intégralement",
    className: "border-transparent bg-success/15 text-[12px] font-semibold text-foreground",
    dot: "bg-success",
  },
  en_retard: {
    label: "En retard",
    className: "border-transparent bg-destructive/15 text-[12px] font-semibold text-destructive",
    dot: "bg-destructive",
  },
};

const METHODS = ["Espèces", "Virement", "Mobile Money", "Chèque", "Carte bancaire"];

// ── Hook PDF ──────────────────────────────────────────────────────────────────

function usePdf(invoiceId: string, number: string) {
  const [blobUrl, setBlobUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  const fetchBlob = async (): Promise<string | null> => {
    if (blobUrl) return blobUrl;
    setPdfLoading(true);
    try {
      const resp = await api.get(`/commerce/invoices/${invoiceId}/invoice.pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(resp.data as Blob);
      setBlobUrl(url);
      return url;
    } catch {
      toast.error("PDF non disponible — configurez vos paramètres de facturation.");
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const openPreview = async () => {
    setPreviewOpen(true);
    await fetchBlob();
  };

  const download = async () => {
    const url = await fetchBlob();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${number}.pdf`;
    a.click();
  };

  return { blobUrl, pdfLoading, previewOpen, setPreviewOpen, openPreview, download };
}

// ── Skeleton de chargement ────────────────────────────────────────────────────

function InvoiceSkeleton() {
  return (
    <PageBody>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      {/* En-tête document */}
      <Card className="gap-0 rounded-[16px] border-border p-6 shadow-none">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Separator className="my-6" />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
          </div>
        </div>
      </Card>
      {/* Tableau articles */}
      <Card className="gap-0 rounded-[16px] border-border p-0 shadow-none overflow-hidden">
        <div className="p-5"><Skeleton className="h-5 w-24 rounded" /></div>
        {[1,2].map((i) => (
          <div key={i} className="flex gap-4 border-t border-border px-5 py-4">
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </Card>
      {/* Totaux + progression */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 rounded-[16px] border-border p-5 shadow-none">
          {[1,2,3].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          ))}
        </Card>
        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </Card>
      </div>
    </PageBody>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const qc     = useQueryClient();
  const [payOpen, setPayOpen]   = useState(false);
  const [sending, setSending]   = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () =>
      request<{ data: BackendInvoice }>(`/commerce/invoices/${id}`)
        .then((r) => adaptInvoice(r.data))
        .catch(() => null),
    staleTime: 30_000,
  });

  const { blobUrl, pdfLoading, previewOpen, setPreviewOpen, openPreview, download } =
    usePdf(id, invoice?.number ?? "");

  const ratio = invoice && invoice.total > 0 ? Math.round((invoice.paid / invoice.total) * 100) : 0;
  const cfg   = invoice ? (statusConfig[invoice.status] ?? statusConfig.brouillon) : statusConfig.brouillon;

  const paySchema = z.object({
    amount:       z.coerce.number().int().min(1, "Montant requis"),
    method:       z.string().min(1, "Mode requis"),
    payment_date: z.string().min(1, "Date requise"),
    reference:    z.string().optional(),
  });

  const form = useForm<z.infer<typeof paySchema>>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      amount:       invoice && invoice.outstanding > 0 ? invoice.outstanding : 0,
      method:       "Espèces",
      payment_date: new Date().toISOString().slice(0, 10),
      reference:    "",
    },
  });

  // resync montant défaut si outstanding change
  useEffect(() => {
    if (invoice && invoice.outstanding > 0) form.setValue("amount", invoice.outstanding);
  }, [invoice, form]);

  const onSubmitPay = async (values: z.infer<typeof paySchema>) => {
    try {
      await request(`/commerce/invoices/${id}/payments`, {
        method: "POST",
        body: {
          amount:       values.amount,
          method:       values.method,
          payment_date: values.payment_date,
          ...(values.reference?.trim() ? { reference: values.reference.trim() } : {}),
        },
      });
      toast.success("Règlement enregistré");
      void qc.invalidateQueries({ queryKey: ["invoice", id] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
      form.reset({ amount: 0, method: "Espèces", payment_date: new Date().toISOString().slice(0, 10), reference: "" });
      setPayOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof paySchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur");
      }
    }
  };

  const markSent = async () => {
    setSending(true);
    try {
      await request(`/commerce/invoices/${id}/mark-sent`, { method: "PATCH" });
      toast.success("Facture marquée comme envoyée");
      void qc.invalidateQueries({ queryKey: ["invoice", id] });
      void qc.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible de modifier la facture");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <InvoiceSkeleton />;

  if (!invoice) {
    return (
      <PageBody>
        <Link to="/factures" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour aux factures
        </Link>
        <p className="py-8 text-center text-muted-foreground">Facture introuvable.</p>
      </PageBody>
    );
  }

  const inv = invoice;

  return (
    <PageBody>
      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/factures"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors duration-150 hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour aux factures
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px] rounded-[10px]"
            disabled={pdfLoading}
            onClick={() => void openPreview()}
          >
            {pdfLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            Aperçu
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px] rounded-[10px]"
            disabled={pdfLoading}
            onClick={() => void download()}
          >
            <Download className="size-4" aria-hidden />
            PDF
          </Button>
          {inv.status === "brouillon" && (
            <Button
              size="sm"
              className="min-h-[40px] rounded-[10px] px-4"
              disabled={sending}
              onClick={() => void markSent()}
            >
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              Marquer envoyée
            </Button>
          )}
        </div>
      </div>

      {/* ── Document principal ───────────────────────────────────────────── */}
      <Card className="gap-0 rounded-[16px] border-border shadow-none overflow-hidden">

        {/* Bandeau statut coloré */}
        <div className={`flex items-center gap-2 px-6 py-2.5 text-[12px] font-semibold ${
          inv.status === "payee"      ? "bg-success/10 text-success" :
          inv.status === "en_retard"  ? "bg-destructive/10 text-destructive" :
          inv.status === "partielle"  ? "bg-warning/10 text-foreground" :
          inv.status === "envoyee"    ? "bg-primary/10 text-primary" :
          "bg-muted text-muted-foreground"
        }`}>
          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>

        <div className="p-6">
          {/* Titre + numéro */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">
                Facture
              </p>
              <h1 className="mono text-[28px] font-bold tracking-tight">{inv.number}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-[13px] text-muted-foreground">
                <span>Émise le {formatDate(inv.issued_at)}</span>
                {inv.due_date && (
                  <span className={`font-medium ${
                    inv.outstanding > 0 && new Date(inv.due_date) < new Date()
                      ? "text-destructive"
                      : ""
                  }`}>
                    · Échéance {formatDate(inv.due_date)}
                  </span>
                )}
                {inv.sale_number && (
                  <span>· Vente <span className="mono">{inv.sale_number}</span></span>
                )}
              </div>
            </div>

            {/* Montant total mis en avant */}
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total TTC</p>
              <p className="tabular text-[32px] font-bold tracking-tight">{formatXAF(inv.total)}</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Émetteur / Destinataire */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Émetteur */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                <Building2 className="size-3.5" aria-hidden />
                Émetteur
              </div>
              {inv.setting ? (
                <div className="text-[14px] leading-relaxed">
                  <p className="font-semibold text-[15px]">{inv.setting.company_name}</p>
                  {inv.setting.niu  && <p className="text-muted-foreground">NIU : <span className="mono text-foreground">{inv.setting.niu}</span></p>}
                  {inv.setting.rccm && <p className="text-muted-foreground">RCCM : <span className="mono text-foreground">{inv.setting.rccm}</span></p>}
                  {inv.setting.address && <p className="text-muted-foreground">{inv.setting.address}</p>}
                  {inv.setting.phone && <p className="mono text-muted-foreground">{inv.setting.phone}</p>}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">
                  Configurez vos coordonnées dans Paramètres → Facturation.
                </p>
              )}
            </div>

            {/* Destinataire */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                <User className="size-3.5" aria-hidden />
                Destinataire
              </div>
              <div className="text-[14px] leading-relaxed">
                <p className="font-semibold text-[15px]">{inv.customer}</p>
                {inv.customer_phone && (
                  <p className="mono text-muted-foreground">{inv.customer_phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Lignes articles (si vente liée) ─────────────────────────── */}
        {inv.lines.length > 0 && (
          <>
            <Separator />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">#</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">PU HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right pr-6">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inv.lines.map((line, i) => (
                    <TableRow key={line.id}>
                      <TableCell className="tabular pl-6 text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{line.designation}</TableCell>
                      <TableCell className="tabular text-right">{line.quantity}</TableCell>
                      <TableCell className="tabular text-right">
                        {formatXAF(line.unit_price)}
                      </TableCell>
                      <TableCell className="tabular text-right text-muted-foreground">
                        {line.vat_rate}%
                      </TableCell>
                      <TableCell className="tabular text-right font-semibold pr-6">
                        {formatXAF(line.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* ── Totaux ──────────────────────────────────────────────────── */}
        <Separator />
        <div className="flex justify-end p-6">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span className="tabular">{formatXAF(inv.total_ht)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-muted-foreground">TVA</span>
              <span className="tabular">{formatXAF(inv.total_vat)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-[17px] font-bold">
              <span>Total TTC</span>
              <span className="tabular">{formatXAF(inv.total)}</span>
            </div>
          </div>
        </div>

        {/* ── Solde dû / en retard ────────────────────────────────────── */}
        {inv.outstanding > 0 && (
          <>
            <Separator />
            <div className={`flex items-center justify-between gap-4 px-6 py-4 ${
              inv.status === "en_retard" ? "bg-destructive/5" : "bg-warning/5"
            }`}>
              <div>
                <p className="text-[13px] font-medium">Reste à payer</p>
                {inv.due_date && (
                  <p className="text-[12px] text-muted-foreground">
                    Échéance {formatDate(inv.due_date)}
                  </p>
                )}
              </div>
              <p className={`tabular text-[22px] font-bold tracking-tight ${
                inv.status === "en_retard" ? "text-destructive" : "text-warning"
              }`}>
                {formatXAF(inv.outstanding)}
              </p>
            </div>
          </>
        )}

        {/* ── Notes ───────────────────────────────────────────────────── */}
        {inv.notes && (
          <>
            <Separator />
            <div className="px-6 py-4">
              <p className="text-[12px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">
                Notes
              </p>
              <p className="text-[14px] text-muted-foreground">{inv.notes}</p>
            </div>
          </>
        )}
      </Card>

      {/* ── Avancement ───────────────────────────────────────────────────── */}
      <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">Avancement du règlement</p>
          <span className="tabular text-[13px] text-muted-foreground">{ratio}%</span>
        </div>
        <Progress value={ratio} className="h-2.5" />
        <div className="flex justify-between text-[13px]">
          <span className="tabular text-muted-foreground">
            Réglé <strong className="text-success">{formatXAF(inv.paid)}</strong>
          </span>
          <span className="tabular text-muted-foreground">
            Total <strong className="text-foreground">{formatXAF(inv.total)}</strong>
          </span>
        </div>
      </Card>

      {/* ── Règlements ───────────────────────────────────────────────────── */}
      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border shadow-none">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-[15px] font-semibold">
            Règlements{" "}
            {inv.payments.length > 0 && (
              <span className="ml-1 text-[12px] font-normal text-muted-foreground">
                ({inv.payments.length})
              </span>
            )}
          </p>
          <Button
            size="sm"
            className="min-h-[40px] rounded-[10px] px-4"
            disabled={inv.status === "payee"}
            onClick={() => {
              form.setValue("amount", inv.outstanding > 0 ? inv.outstanding : 0);
              setPayOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Enregistrer un règlement
          </Button>
        </div>

        {inv.payments.length > 0 ? (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inv.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="tabular">{formatDate(p.date)}</TableCell>
                  <TableCell>
                    <Badge className="border-transparent bg-muted text-[11px] font-medium text-foreground">
                      {p.method}
                    </Badge>
                  </TableCell>
                  <TableCell className="mono text-[12px] text-muted-foreground">
                    {p.reference ?? "—"}
                  </TableCell>
                  <TableCell className="tabular text-right font-semibold">
                    {formatXAF(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-[14px] text-muted-foreground">Aucun règlement enregistré.</p>
            {inv.status !== "payee" && (
              <p className="text-[12px] text-muted-foreground">
                Cliquez sur "Enregistrer un règlement" pour commencer.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ── Dialog prévisualisation PDF ──────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex h-[92vh] max-w-4xl flex-col gap-0 p-0">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-primary" aria-hidden />
              <div>
                <p className="text-[15px] font-semibold">{inv.number}</p>
                <p className="text-[12px] text-muted-foreground">{inv.customer}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[36px] rounded-[8px]"
                disabled={pdfLoading}
                onClick={() => void download()}
              >
                <Download className="size-3.5" aria-hidden />
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer l'aperçu"
                className="min-h-[36px] min-w-[36px] rounded-[8px]"
                onClick={() => setPreviewOpen(false)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 bg-muted/20">
            {pdfLoading && (
              <div className="flex h-full flex-col gap-4 p-6">
                <div className="flex justify-between">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-44 rounded" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-4 w-36 rounded" />
                  </div>
                </div>
                <Skeleton className="h-px w-full rounded" />
                <div className="grid grid-cols-2 gap-8">
                  {[0,1].map((i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <Skeleton className="h-3 w-16 rounded" />
                      <Skeleton className="h-5 w-40 rounded" />
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-32 w-full rounded" />
                <div className="ml-auto flex flex-col gap-1.5 w-56">
                  {[0,1,2].map((i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 text-[13px] text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Génération du document…
                </div>
              </div>
            )}

            {!pdfLoading && blobUrl && (
              <iframe
                src={blobUrl}
                title={`Facture ${inv.number}`}
                className="h-full w-full border-none"
              />
            )}

            {!pdfLoading && !blobUrl && (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <FileText className="size-12 text-muted-foreground" aria-hidden />
                <p className="text-[15px] font-medium">PDF non disponible</p>
                <p className="max-w-xs text-[13px] text-muted-foreground">
                  Configurez votre entête de facturation dans Paramètres → Facturation.
                </p>
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-[10px]"
                  onClick={() => void openPreview()}
                >
                  Réessayer
                </Button>
              </div>
            )}
          </div>

          {/* Pied résumé */}
          <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
            <div className="flex flex-wrap items-center gap-4 text-[13px]">
              <span className="tabular text-muted-foreground">
                TTC <strong className="text-foreground">{formatXAF(inv.total)}</strong>
              </span>
              <span className="tabular text-muted-foreground">
                Réglé <strong className="text-success">{formatXAF(inv.paid)}</strong>
              </span>
              {inv.outstanding > 0 && (
                <span className="tabular text-muted-foreground">
                  Solde <strong className="text-destructive">{formatXAF(inv.outstanding)}</strong>
                </span>
              )}
            </div>
            <Badge className={cfg.className}>{cfg.label}</Badge>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog règlement ─────────────────────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={(v) => { setPayOpen(v); if (!v) form.reset(); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Enregistrer un règlement</DialogTitle>
            <DialogDescription>
              Facture <strong>{inv.number}</strong> — solde : <strong>{formatXAF(inv.outstanding)}</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPay)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (XAF)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        className="tabular min-h-[44px] rounded-[10px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de paiement</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px] rounded-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="N° virement, chèque…"
                        className="mono min-h-[44px] rounded-[10px]"
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
