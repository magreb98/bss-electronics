import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { request } from "@/lib/api";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/electronique/sav/$id")({
  head: () => ({
    meta: [
      { title: "Ticket SAV — BSS POS" },
      { property: "og:title", content: "Ticket SAV — BSS POS" },
    ],
  }),
  component: ServiceTicketDetailPage,
});

interface BackendTicket {
  id: string;
  reference?: string | null;
  customer?: { id: string; name: string } | null;
  product_label?: string | null;
  serial_number?: string | null;
  status: "recu" | "diagnostic" | "reparation" | "pret" | "rendu";
  under_warranty: boolean;
  repair_cost: number;
  created_at: string;
  notes?: string | null;
  warranty_ends_at?: string | null;
}

const steps = [
  { key: "recu", label: "Reçu" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "reparation", label: "En réparation" },
  { key: "pret", label: "Prêt" },
  { key: "rendu", label: "Rendu" },
] as const;

function ServiceTicketDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [advancing, setAdvancing] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["service-ticket", id],
    queryFn: () =>
      request<{ data: BackendTicket }>(`/electronics/service-tickets/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 30_000,
  });

  const currentIdx = ticket ? steps.findIndex((s) => s.key === ticket.status) : -1;
  const nextStep = currentIdx >= 0 ? steps[currentIdx + 1] : undefined;

  const advance = async () => {
    if (!nextStep || !ticket) return;
    setAdvancing(true);
    try {
      await request(`/electronics/service-tickets/${id}`, {
        method: "PATCH",
        body: { status: nextStep.key },
      });
      toast.success(`Statut mis à jour → ${nextStep.label}`);
      void qc.invalidateQueries({ queryKey: ["service-ticket", id] });
      void qc.invalidateQueries({ queryKey: ["service-tickets"] });
      if (nextStep.key === "rendu") void navigate({ to: "/electronique/sav" });
    } catch {
      toast.error("Impossible de faire avancer le ticket");
    } finally {
      setAdvancing(false);
    }
  };

  const payRepair = async () => {
    if (!ticket || ticket.repair_cost === 0) return;
    setPaying(true);
    try {
      await request(`/electronics/service-tickets/${id}/pay`, {
        method: "POST",
        body: { amount: ticket.repair_cost, method: "especes" },
      });
      toast.success(`Paiement de ${formatXAF(ticket.repair_cost)} enregistré`);
      void qc.invalidateQueries({ queryKey: ["service-ticket", id] });
      void qc.invalidateQueries({ queryKey: ["service-tickets"] });
    } catch {
      toast.error("Erreur lors du paiement");
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-24 rounded-[16px]" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-[16px]" />
          <Skeleton className="h-40 rounded-[16px]" />
        </div>
      </PageBody>
    );
  }

  if (!ticket) {
    return (
      <PageBody>
        <Link to="/electronique/sav" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour au SAV
        </Link>
        <p className="py-8 text-center text-muted-foreground">Ticket introuvable.</p>
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={ticket.reference ?? ticket.id.slice(0, 8).toUpperCase()}
        description={`${ticket.product_label ?? "—"} · ${ticket.customer?.name ?? "—"}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden />
              Bon de dépôt
            </Button>
            {nextStep && (
              <Button
                className="min-h-[44px] rounded-[10px] px-5"
                disabled={advancing}
                onClick={() => void advance()}
              >
                {advancing && <Loader2 className="size-4 animate-spin" aria-hidden />}
                → {nextStep.label}
              </Button>
            )}
          </div>
        }
      />

      <Link to="/electronique/sav" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour au SAV
      </Link>

      <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
        <p className="text-[17px] font-semibold tracking-tight">Progression</p>
        <ol className="flex flex-wrap gap-2">
          {steps.map((s, i) => (
            <li
              key={s.key}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                i < currentIdx
                  ? "bg-success/15 text-success"
                  : i === currentIdx
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentIdx && "✓ "}{s.label}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-3 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[17px] font-semibold tracking-tight">Appareil</p>
          <dl className="grid gap-1.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Produit</dt>
              <dd className="font-medium text-right">{ticket.product_label ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">IMEI / Série</dt>
              <dd className="mono font-medium">{ticket.serial_number ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Déposé le</dt>
              <dd>{formatDate(ticket.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Garantie</dt>
              <dd>
                {ticket.under_warranty ? (
                  <Badge className="border-transparent bg-success/15 text-[11px] font-semibold text-foreground">
                    Sous garantie
                  </Badge>
                ) : (
                  <Badge className="border-transparent bg-muted text-[11px] font-semibold text-foreground">
                    Hors garantie
                  </Badge>
                )}
              </dd>
            </div>
            {ticket.warranty_ends_at && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expire le</dt>
                <dd>{formatDate(ticket.warranty_ends_at)}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="gap-3 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[17px] font-semibold tracking-tight">Coût de réparation</p>
          <p className={`tabular text-[28px] font-bold tracking-tight ${ticket.repair_cost === 0 ? "text-success" : ""}`}>
            {ticket.repair_cost === 0 ? "Gratuit" : formatXAF(ticket.repair_cost)}
          </p>
          {ticket.under_warranty && (
            <p className="text-[13px] text-muted-foreground">Pris en charge sous garantie constructeur.</p>
          )}
          {ticket.notes && (
            <p className="text-[13px] text-muted-foreground">{ticket.notes}</p>
          )}
          <Button
            className="mt-2 min-h-[44px] w-full rounded-[10px]"
            disabled={ticket.repair_cost === 0 || paying}
            onClick={() => void payRepair()}
          >
            {paying && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {ticket.repair_cost > 0
              ? `Encaisser ${formatXAF(ticket.repair_cost)}`
              : "Sous garantie"}
          </Button>
        </Card>
      </div>
    </PageBody>
  );
}
