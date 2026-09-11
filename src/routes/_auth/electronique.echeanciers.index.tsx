import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatXAF } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";

export const Route = createFileRoute("/_auth/electronique/echeanciers/")({
  head: () => ({
    meta: [
      { title: "Paiements échelonnés — BSS POS" },
      {
        name: "description",
        content: "Suivez les échéanciers clients, versements réglés et retards de paiement.",
      },
      { property: "og:title", content: "Paiements échelonnés — BSS POS" },
      { property: "og:description", content: "Vendez en plusieurs fois en toute sérénité." },
    ],
  }),
  component: SchedulesPage,
});

interface BackendSchedule {
  id: string;
  reference?: string | null;
  customer?: { id: string; name: string } | null;
  sale?: { id: string; number?: string | null } | null;
  total_amount: number;
  paid_amount: number;
  installments_count: number;
  paid_installments_count: number;
  next_installment_date?: string | null;
  status: "active" | "completed" | "overdue";
}

interface BackendInstallment {
  id: string;
  payment_schedule_id: string;
  customer?: { id: string; name: string } | null;
  due_date: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paid_at: string | null;
}

const SCHEDULE_STATUS: Record<string, string> = {
  active:    "En cours",
  completed: "Soldé",
  overdue:   "En retard",
};

const SCHEDULE_CLASS: Record<string, string> = {
  active:    "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground",
  completed: "border-transparent bg-success/15 text-[11px] font-semibold text-foreground",
  overdue:   "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive",
};

function SchedulesPage() {
  const qc = useQueryClient();

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["payment-schedules"],
    queryFn: () =>
      request<{ data: BackendSchedule[] }>("/electronics/payment-schedules")
        .then((r) => r.data)
        .catch(() => [] as BackendSchedule[]),
    staleTime: 30_000,
  });

  const { data: installments = [], isLoading: installmentsLoading } = useQuery({
    queryKey: ["installments"],
    queryFn: () =>
      request<{ data: BackendInstallment[] }>("/electronics/installments")
        .then((r) => r.data)
        .catch(() => [] as BackendInstallment[]),
    staleTime: 30_000,
  });

  const totalEncours = schedules
    .filter((s) => s.status !== "completed")
    .reduce((sum, s) => sum + (s.total_amount - s.paid_amount), 0);

  const pendingThisMonth = installments.filter((i) => {
    if (i.status === "paid") return false;
    const due = new Date(i.due_date);
    const now = new Date();
    return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
  });

  const overdueCount = installments.filter((i) => i.status === "overdue").length;

  const encaisserInstallment = async (ins: BackendInstallment) => {
    try {
      await request(`/electronics/installments/${ins.id}`, { method: "PATCH", body: { status: "paid" } });
      toast.success(`Versement de ${formatXAF(ins.amount)} enregistré`);
      void qc.invalidateQueries({ queryKey: ["installments"] });
      void qc.invalidateQueries({ queryKey: ["payment-schedules"] });
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <PageBody>
      <PageHeader title="Échéanciers" description="Ventes réglées en plusieurs versements." />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Encours total"
          value={schedulesLoading ? "…" : formatXAF(totalEncours)}
          icon={Wallet}
        />
        <KpiCard
          label="Versements du mois"
          value={installmentsLoading ? "…" : String(pendingThisMonth.length)}
          icon={Wallet}
        />
        <KpiCard
          label="En retard"
          value={installmentsLoading ? "…" : String(overdueCount)}
          icon={Wallet}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {schedulesLoading ? (
          <p className="col-span-full py-8 text-center text-muted-foreground">Chargement…</p>
        ) : schedules.length === 0 ? (
          <p className="col-span-full py-8 text-center text-muted-foreground">Aucun échéancier actif.</p>
        ) : (
          schedules.map((s) => {
            const ratio = s.total_amount > 0
              ? Math.round((s.paid_amount / s.total_amount) * 100)
              : 0;
            return (
              <Card key={s.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="mono text-[12px] text-muted-foreground">
                      {s.reference ?? s.id.slice(0, 8).toUpperCase()}
                    </p>
                    <h2 className="truncate text-[16px] font-semibold">
                      {s.customer?.name ?? "—"}
                    </h2>
                  </div>
                  <Badge className={SCHEDULE_CLASS[s.status] ?? SCHEDULE_CLASS["active"]}>
                    {SCHEDULE_STATUS[s.status] ?? s.status}
                  </Badge>
                </div>

                <Progress value={ratio} className="mt-4 h-2" />
                <p className="tabular mt-2 text-[12px] text-muted-foreground">
                  {s.paid_installments_count}/{s.installments_count} versements ·{" "}
                  {formatXAF(s.paid_amount)} sur {formatXAF(s.total_amount)}
                </p>
                {s.next_installment_date && (
                  <p className="tabular mt-1 text-[12px] text-muted-foreground">
                    Prochaine échéance{" "}
                    <span className={s.status === "overdue" ? "font-medium text-destructive" : "font-medium text-foreground"}>
                      {formatDate(s.next_installment_date)}
                    </span>
                  </p>
                )}

                <Button
                  variant="outline"
                  className="mt-4 min-h-[44px] w-full rounded-[10px]"
                  asChild
                  disabled={s.status === "completed"}
                >
                  <Link to="/electronique/echeanciers/$id" params={{ id: s.id }}>
                    Voir le détail
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </Card>
            );
          })
        )}
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <div className="px-5 py-4">
          <p className="text-[17px] font-semibold tracking-tight">Mensualités en attente</p>
        </div>
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {installmentsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : (
              installments
                .filter((i) => i.status !== "paid")
                .map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.customer?.name ?? "—"}</TableCell>
                    <TableCell className="tabular">{formatDate(i.due_date)}</TableCell>
                    <TableCell className="tabular text-right font-semibold">{formatXAF(i.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          i.status === "overdue"
                            ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                            : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                        }
                      >
                        {i.status === "overdue" ? "En retard" : "À venir"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        className="min-h-[44px] rounded-[10px] px-3 text-[13px]"
                        onClick={() => void encaisserInstallment(i)}
                      >
                        <Loader2 className="hidden size-3.5 animate-spin" aria-hidden />
                        Encaisser
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
            )}
            {!installmentsLoading && installments.filter((i) => i.status !== "paid").length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Toutes les mensualités sont réglées.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
