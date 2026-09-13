import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCashSession, type CashClosingReport } from "@/hooks/use-cash-session";
import { request } from "@/lib/api";
import { formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse & dépenses — BSS POS" },
      {
        name: "description",
        content: "Sessions de caisse, dépenses du jour et rapports de clôture.",
      },
      { property: "og:title", content: "Caisse & dépenses — BSS POS" },
      { property: "og:description", content: "Contrôlez vos flux d'espèces au quotidien." },
    ],
  }),
  component: CashPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  label: string;
  amount: number;
  created_at: string;
}

interface ExpectedCash {
  opening_balance: number;
  cash_sales: number;
  mobile_money_sales: number;
  expenses: number;
  expected_cash: number;
}

interface SessionHistory {
  id: string;
  state: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  cash_register?: { name: string; point_of_sale?: { name: string } };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  label:  z.string().min(2, "Libellé requis"),
  amount: z.coerce.number().int().min(1, "Montant requis"),
});

const closingSchema = z.object({
  declared_cash: z.coerce.number().int().min(0, "Montant requis"),
});

// ── Rapport de clôture ────────────────────────────────────────────────────────

function ClosingReportDialog({
  report,
  onClose,
}: {
  report: CashClosingReport;
  onClose: () => void;
}) {
  const isExact = report.discrepancy === 0;
  const isShort = report.discrepancy < 0;
  const discAbs = Math.abs(report.discrepancy);

  const rows = [
    { label: "Fond d'ouverture",   value: report.opening_balance,    highlight: false },
    { label: "Ventes espèces",     value: report.cash_sales,         highlight: false },
    { label: "Ventes Mobile Money",value: report.mobile_money_sales, highlight: false },
    { label: "Dépenses",           value: -report.expenses,          highlight: false },
  ];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="rounded-[16px] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExact ? (
              <CheckCircle2 className="size-5 text-success" aria-hidden />
            ) : (
              <AlertCircle className="size-5 text-warning" aria-hidden />
            )}
            Rapport de clôture
          </DialogTitle>
          <DialogDescription>
            Session clôturée — résumé comptable de la journée.
          </DialogDescription>
        </DialogHeader>

        {/* Tableau des composantes */}
        <div className="rounded-[12px] border border-border overflow-hidden">
          {rows.map(({ label, value }, i) => (
            <div key={i} className="flex items-center justify-between border-b border-border last:border-0 px-4 py-2.5">
              <span className="text-[13px] text-muted-foreground">{label}</span>
              <span className={`tabular text-[14px] font-medium ${value < 0 ? "text-destructive" : ""}`}>
                {value < 0 ? `−${formatXAF(Math.abs(value))}` : formatXAF(value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
            <span className="text-[13px] font-semibold">Solde théorique</span>
            <span className="tabular text-[15px] font-bold">{formatXAF(report.expected_cash)}</span>
          </div>
        </div>

        <Separator />

        {/* Fond déclaré + écart */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">Fond déclaré</span>
            <span className="tabular text-[15px] font-semibold">{formatXAF(report.declared_cash)}</span>
          </div>

          <div className={`flex items-center justify-between rounded-[10px] px-4 py-3 border ${
            isExact
              ? "bg-success/10 border-success/30"
              : "bg-warning/10 border-warning/30"
          }`}>
            <div className="flex items-center gap-2">
              {isExact
                ? <CheckCircle2 className="size-4 text-success" aria-hidden />
                : <AlertCircle className="size-4 text-warning" aria-hidden />}
              <span className="text-[13px] font-semibold">
                {isExact ? "Caisse équilibrée" : isShort ? "Manque en caisse" : "Excédent en caisse"}
              </span>
            </div>
            <span className={`tabular text-[17px] font-bold ${
              isExact ? "text-success" : isShort ? "text-destructive" : "text-warning"
            }`}>
              {isExact ? "0 XAF" : `${isShort ? "−" : "+"}${formatXAF(discAbs)}`}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button className="min-h-[44px] w-full rounded-[10px] px-6" onClick={onClose}>
            Terminer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

function CashPage() {
  const { session, closeWithReport } = useCashSession();
  const qc = useQueryClient();

  const [expenseOpen,   setExpenseOpen]   = useState(false);
  const [closingOpen,   setClosingOpen]   = useState(false);
  const [closingReport, setClosingReport] = useState<CashClosingReport | null>(null);

  // Dépenses session courante
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", session?.id],
    queryFn:  () =>
      request<{ data: Expense[] }>("/commerce/expenses", { params: { cash_session_id: session?.id } })
        .then((r) => r.data)
        .catch(() => [] as Expense[]),
    staleTime: 30_000,
    enabled: Boolean(session),
  });

  // Historique sessions
  const { data: sessionsHistory = [] } = useQuery({
    queryKey: ["cash-sessions"],
    queryFn: async () => {
      const { request: req } = await import("@/lib/api");
      try {
        const r = await req<{ data: SessionHistory[] }>("/commerce/cash-sessions");
        return r.data;
      } catch {
        return [] as SessionHistory[];
      }
    },
    staleTime: 30_000,
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Position de caisse en direct — inclut les ventes espèces de la session,
  // contrairement au calcul local (ouverture − dépenses) qui les ignorait.
  const { data: expected } = useQuery({
    queryKey: ["cash-session-expected", session?.id],
    queryFn: () =>
      request<{ data: ExpectedCash }>(`/commerce/cash-sessions/${session?.id}/expected-cash`)
        .then((r) => r.data),
    enabled: Boolean(session),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const expectedCash = expected?.expected_cash ?? (session ? session.opening_balance - totalExpenses : 0);
  const cashSales = expected?.cash_sales ?? 0;

  // ── Formulaire dépense ──────────────────────────────────────────────────────

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { label: "", amount: 0 },
  });

  const onSubmitExpense = async (values: z.infer<typeof expenseSchema>) => {
    try {
      await request("/commerce/expenses", {
        method: "POST",
        body: { label: values.label, amount: values.amount, cash_session_id: session?.id },
      });
      toast.success("Dépense enregistrée");
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      expenseForm.reset();
      setExpenseOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          expenseForm.setError(f as keyof z.infer<typeof expenseSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur");
      }
    }
  };

  // ── Formulaire clôture ──────────────────────────────────────────────────────

  const closingForm = useForm<z.infer<typeof closingSchema>>({
    resolver: zodResolver(closingSchema),
    defaultValues: { declared_cash: expectedCash },
  });

  const onSubmitClosing = async (values: z.infer<typeof closingSchema>) => {
    try {
      const report = await closeWithReport(values.declared_cash);
      toast.success("Session clôturée");
      void qc.invalidateQueries({ queryKey: ["cash-sessions"] });
      void qc.invalidateQueries({ queryKey: ["expenses"] });
      closingForm.reset();
      setClosingOpen(false);
      setClosingReport(report);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible de clôturer");
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Caisse"
        description={
          session
            ? `${session.cash_register} · ouverte le ${formatDateTime(session.opened_at)}`
            : "Aucune session de caisse ouverte."
        }
        action={
          session ? (
            <Button
              className="min-h-[44px] rounded-[10px] px-5"
              onClick={() => {
                closingForm.reset({ declared_cash: expectedCash });
                setClosingOpen(true);
              }}
            >
              Clôturer la session
            </Button>
          ) : null
        }
      />

      <Tabs defaultValue="session">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="session"    className="min-h-[36px]">Session en cours</TabsTrigger>
          <TabsTrigger value="historique" className="min-h-[36px]">Historique</TabsTrigger>
        </TabsList>

        {/* ── Session en cours ─────────────────────────────────────────── */}
        <TabsContent value="session" className="mt-4 flex flex-col gap-4">
          {!session ? (
            <Card className="flex flex-col items-center gap-3 rounded-[16px] border-border p-10 shadow-none text-center">
              <Wallet className="size-10 text-muted-foreground" aria-hidden />
              <p className="text-[15px] font-medium">Aucune session ouverte</p>
              <p className="max-w-xs text-[13px] text-muted-foreground">
                Ouvrez une session depuis le POS pour commencer à encaisser.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Fond d'ouverture" value={formatXAF(session.opening_balance)} icon={Wallet} />
                <KpiCard label="Ventes espèces"   value={formatXAF(cashSales)}                icon={Coins} />
                <KpiCard label="Dépenses"         value={formatXAF(totalExpenses)}            icon={Banknote} />
                <KpiCard
                  label="Solde estimé espèces"
                  value={formatXAF(expectedCash)}
                  icon={CreditCard}
                />
              </div>

              {/* Dépenses */}
              <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[17px] font-semibold">Dépenses de la session</h2>
                  <Button
                    className="min-h-[44px] rounded-[10px] px-4"
                    onClick={() => { expenseForm.reset(); setExpenseOpen(true); }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Dépense
                  </Button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.label}</TableCell>
                          <TableCell className="tabular text-[13px] text-muted-foreground">
                            {formatDateTime(e.created_at)}
                          </TableCell>
                          <TableCell className="tabular text-right">
                            {formatXAF(e.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {expenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                            Aucune dépense enregistrée.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Historique sessions ───────────────────────────────────────── */}
        <TabsContent value="historique" className="mt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Caisse</TableHead>
                  <TableHead>Ouverture</TableHead>
                  <TableHead>Fermeture</TableHead>
                  <TableHead className="text-right">Fond ouv.</TableHead>
                  <TableHead className="text-right">Fond clôt.</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsHistory.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium">{s.cash_register?.name ?? "—"}</p>
                      {s.cash_register?.point_of_sale?.name && (
                        <p className="text-[12px] text-muted-foreground">
                          {s.cash_register.point_of_sale.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-[13px]">
                      {formatDateTime(s.opened_at)}
                    </TableCell>
                    <TableCell className="tabular text-[13px] text-muted-foreground">
                      {s.closed_at ? formatDateTime(s.closed_at) : "—"}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatXAF(s.opening_balance)}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {s.closing_balance != null ? formatXAF(s.closing_balance) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          s.state === "open"
                            ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                            : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                        }
                      >
                        {s.state === "open" ? "Ouverte" : "Fermée"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {sessionsHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Aucune session enregistrée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog : enregistrer une dépense ───────────────────────────── */}
      <Dialog
        open={expenseOpen}
        onOpenChange={(v) => { setExpenseOpen(v); if (!v) expenseForm.reset(); }}
      >
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Enregistrer une dépense</DialogTitle>
            <DialogDescription>La dépense est imputée à la session en cours.</DialogDescription>
          </DialogHeader>
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="flex flex-col gap-4">
              <FormField
                control={expenseForm.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé</FormLabel>
                    <FormControl>
                      <Input placeholder="Transport, carburant…" className="min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={expenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (XAF)</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="1" className="tabular min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  className="min-h-[44px] rounded-[10px]"
                  disabled={expenseForm.formState.isSubmitting}
                >
                  {expenseForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : clôturer la session ───────────────────────────────── */}
      <Dialog
        open={closingOpen}
        onOpenChange={(v) => { setClosingOpen(v); if (!v) closingForm.reset(); }}
      >
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Clôturer la session</DialogTitle>
            <DialogDescription>
              Comptez le fond de caisse réel et saisissez le montant.
              Le rapport comptable sera généré automatiquement.
            </DialogDescription>
          </DialogHeader>

          {/* Récap pré-clôture */}
          <div className="rounded-[12px] border border-border bg-muted/30 p-4 text-[13px]">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Fond d'ouverture</span>
              <span className="tabular font-medium">{formatXAF(session?.opening_balance ?? 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Ventes espèces</span>
              <span className="tabular font-medium">{formatXAF(cashSales)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Dépenses enregistrées</span>
              <span className="tabular font-medium text-destructive">−{formatXAF(totalExpenses)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="font-semibold">Solde estimé espèces</span>
              <span className="tabular font-bold">{formatXAF(expectedCash)}</span>
            </div>
          </div>

          <Form {...closingForm}>
            <form onSubmit={closingForm.handleSubmit(onSubmitClosing)} className="flex flex-col gap-4">
              <FormField
                control={closingForm.control}
                name="declared_cash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fond déclaré (XAF)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        className="tabular min-h-[44px] rounded-[10px] text-[17px] font-bold"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Saisissez le montant réel compté en caisse.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] rounded-[10px]"
                  onClick={() => setClosingOpen(false)}
                  disabled={closingForm.formState.isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="min-h-[44px] rounded-[10px] px-5"
                  disabled={closingForm.formState.isSubmitting}
                >
                  {closingForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Clôturer et générer le rapport
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Rapport de clôture (affiché après fermeture) ───────────────── */}
      {closingReport && (
        <ClosingReportDialog
          report={closingReport}
          onClose={() => setClosingReport(null)}
        />
      )}
    </PageBody>
  );
}
