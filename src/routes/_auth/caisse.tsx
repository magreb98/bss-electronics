import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashSession } from "@/hooks/use-cash-session";
import { formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse & dépenses — BSS POS" },
      {
        name: "description",
        content: "Sessions de caisse, dépenses du jour et rapports de clôture de la boutique.",
      },
      { property: "og:title", content: "Caisse & dépenses — BSS POS" },
      { property: "og:description", content: "Contrôlez vos flux d'espèces au quotidien." },
    ],
  }),
  component: CashPage,
});

const expenses = [
  { id: 1, label: "Transport livraison", amount: 5000, at: new Date().toISOString() },
  { id: 2, label: "Carburant groupe électrogène", amount: 12000, at: new Date().toISOString() },
];

function CashPage() {
  const { session, close } = useCashSession();
  const [amount, setAmount] = useState(0);
  const [label, setLabel] = useState("");
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

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
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => {
                close();
                toast.success("Session clôturée");
              }}
            >
              Clôturer la session
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Fond de caisse"
          value={formatXAF(session?.opening_float ?? 0)}
          icon={Wallet}
        />
        <KpiCard label="Dépenses" value={formatXAF(totalExpenses)} icon={Banknote} />
        <KpiCard
          label="Solde théorique"
          value={formatXAF((session?.opening_float ?? 0) - totalExpenses)}
          icon={Wallet}
        />
      </div>

      <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold">Dépenses de la session</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Dépense
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[16px]">
              <DialogHeader>
                <DialogTitle>Enregistrer une dépense</DialogTitle>
                <DialogDescription>La dépense est imputée à la session en cours.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="expense-label">Libellé</Label>
                  <Input
                    id="expense-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="min-h-[44px] rounded-[10px]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="expense-amount">Montant XAF</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="1"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(Math.trunc(e.target.valueAsNumber || 0))}
                    className="tabular min-h-[44px] rounded-[10px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="min-h-[44px] rounded-[10px]"
                  onClick={() => toast.success("Dépense enregistrée")}
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  <TableCell className="tabular">{formatDateTime(e.at)}</TableCell>
                  <TableCell className="tabular text-right">{formatXAF(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageBody>
  );
}
