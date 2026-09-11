import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";

import { PageBody, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/electronique/echeanciers/$id")({
  head: () => ({
    meta: [
      { title: "Échéancier — BSS POS" },
      { property: "og:title", content: "Échéancier — BSS POS" },
    ],
  }),
  component: ScheduleDetailPage,
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

function ScheduleDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["payment-schedule", id],
    queryFn: () =>
      request<{ data: BackendSchedule }>(`/electronics/payment-schedules/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 30_000,
  });

  const { data: installments = [], isLoading: loadingInstallments } = useQuery({
    queryKey: ["installments", id],
    queryFn: () =>
      request<{ data: BackendInstallment[] }>(`/electronics/installments?payment_schedule_id=${id}`)
        .then((r) => r.data)
        .catch(() => [] as BackendInstallment[]),
    staleTime: 30_000,
  });

  const encaisser = async (ins: BackendInstallment) => {
    try {
      await request(`/electronics/installments/${ins.id}`, { method: "PATCH", body: { status: "paid" } });
      toast.success(`Versement de ${formatXAF(ins.amount)} enregistré`);
      void qc.invalidateQueries({ queryKey: ["installments", id] });
      void qc.invalidateQueries({ queryKey: ["payment-schedule", id] });
      void qc.invalidateQueries({ queryKey: ["payment-schedules"] });
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-[16px]" />)}
        </div>
        <Skeleton className="h-48 rounded-[16px]" />
      </PageBody>
    );
  }

  if (!schedule) {
    return (
      <PageBody>
        <Link to="/electronique/echeanciers" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour aux échéanciers
        </Link>
        <p className="py-8 text-center text-muted-foreground">Échéancier introuvable.</p>
      </PageBody>
    );
  }

  const ratio = schedule.total_amount > 0
    ? Math.round((schedule.paid_amount / schedule.total_amount) * 100)
    : 0;

  return (
    <PageBody>
      <PageHeader
        title={schedule.reference ?? schedule.id.slice(0, 8).toUpperCase()}
        description={schedule.customer?.name ?? "—"}
        action={
          <Button
            variant="outline"
            className="min-h-[44px] rounded-[10px]"
            onClick={() => toast.info("PDF non disponible")}
          >
            <FileDown className="size-4" aria-hidden />
            Contrat PDF
          </Button>
        }
      />

      <Link to="/electronique/echeanciers" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux échéanciers
      </Link>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Montant total</p>
          <p className="tabular text-[22px] font-bold tracking-tight">{formatXAF(schedule.total_amount)}</p>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Déjà réglé</p>
          <p className="tabular text-[22px] font-bold tracking-tight text-success">{formatXAF(schedule.paid_amount)}</p>
        </Card>
        <Card className="gap-1 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[12px] text-muted-foreground">Solde restant</p>
          <p className={`tabular text-[22px] font-bold tracking-tight ${schedule.status === "overdue" ? "text-destructive" : ""}`}>
            {formatXAF(schedule.total_amount - schedule.paid_amount)}
          </p>
        </Card>
      </div>

      <Card className="gap-3 rounded-[16px] border-border p-5 shadow-none">
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-semibold tracking-tight">Progression</p>
          <span className="tabular text-[13px] text-muted-foreground">
            {schedule.paid_installments_count}/{schedule.installments_count} versements
          </span>
        </div>
        <Progress value={ratio} className="h-3" />
        {schedule.next_installment_date && (
          <p className="text-[13px] text-muted-foreground">
            Prochaine échéance :{" "}
            <span className={`font-medium ${schedule.status === "overdue" ? "text-destructive" : "text-foreground"}`}>
              {formatDate(schedule.next_installment_date)}
            </span>
          </p>
        )}
      </Card>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Échéance</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingInstallments ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : installments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aucune mensualité enregistrée.
                </TableCell>
              </TableRow>
            ) : (
              installments.map((ins) => (
                <TableRow key={ins.id}>
                  <TableCell>{formatDate(ins.due_date)}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{formatXAF(ins.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        ins.status === "overdue"
                          ? "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                          : ins.status === "paid"
                            ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                            : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                      }
                    >
                      {ins.status === "overdue" ? "En retard" : ins.status === "paid" ? "Payée" : "À venir"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      className="min-h-[44px] rounded-[10px] px-3 text-[13px]"
                      disabled={ins.status === "paid"}
                      onClick={() => void encaisser(ins)}
                    >
                      <Loader2 className="hidden size-3.5 animate-spin" aria-hidden />
                      Encaisser
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
