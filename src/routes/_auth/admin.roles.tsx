import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { Check, Minus } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_auth/admin/roles")({
  head: () => ({
    meta: [
      { title: "Rôles et permissions — BSS POS" },
      {
        name: "description",
        content:
          "Définissez ce que peuvent faire les vendeurs, les gérants et le propriétaire de la boutique.",
      },
      { property: "og:title", content: "Rôles et permissions — BSS POS" },
      {
        property: "og:description",
        content: "Droits d'accès par rôle : vente, remises, stock, rapports et administration.",
      },
    ],
  }),
  component: RolesPage,
});

type RoleKey = "vendeur" | "gerant" | "proprietaire";

const roles: { key: RoleKey; label: string; hint: string }[] = [
  { key: "vendeur", label: "Vendeur", hint: "Encaisse et consulte le stock" },
  { key: "gerant", label: "Gérant", hint: "Pilote la boutique au quotidien" },
  { key: "proprietaire", label: "Propriétaire", hint: "Accès total, non modifiable" },
];

type Permission = {
  id: string;
  group: string;
  label: string;
  defaults: Record<RoleKey, boolean>;
};

const permissions: Permission[] = [
  {
    id: "sale.create",
    group: "Vente",
    label: "Encaisser une vente",
    defaults: { vendeur: true, gerant: true, proprietaire: true },
  },
  {
    id: "sale.discount",
    group: "Vente",
    label: "Appliquer une remise",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "sale.cancel",
    group: "Vente",
    label: "Annuler une vente confirmée",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "cash.close",
    group: "Caisse",
    label: "Clôturer la caisse",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "cash.expense",
    group: "Caisse",
    label: "Enregistrer une dépense",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "stock.adjust",
    group: "Stock",
    label: "Ajuster le stock",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "stock.cost",
    group: "Stock",
    label: "Voir les prix d'achat et marges",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "invoice.manage",
    group: "Facturation",
    label: "Créer et envoyer des factures B2B",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "report.view",
    group: "Pilotage",
    label: "Consulter les rapports",
    defaults: { vendeur: false, gerant: true, proprietaire: true },
  },
  {
    id: "admin.users",
    group: "Administration",
    label: "Gérer les utilisateurs et les rôles",
    defaults: { vendeur: false, gerant: false, proprietaire: true },
  },
  {
    id: "admin.billing",
    group: "Administration",
    label: "Modifier les paramètres de facturation",
    defaults: { vendeur: false, gerant: false, proprietaire: true },
  },
];

function RolesPage() {
  const [matrix, setMatrix] = useState<Record<string, Record<RoleKey, boolean>>>(() =>
    Object.fromEntries(permissions.map((p) => [p.id, { ...p.defaults }])),
  );

  const toggle = (permissionId: string, role: RoleKey, value: boolean) => {
    setMatrix((prev) => {
      const current = prev[permissionId];
      if (!current) return prev;
      return { ...prev, [permissionId]: { ...current, [role]: value } };
    });
  };

  const groups = [...new Set(permissions.map((p) => p.group))];

  return (
    <PageBody>
      <PageHeader
        title="Rôles et permissions"
        description="Trois rôles : vendeur, gérant, propriétaire. Cochez les droits accordés."
        action={
          <Button
            className="min-h-[44px] rounded-[10px] px-6"
            onClick={() => toast.success("Permissions enregistrées")}
          >
            Enregistrer
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.key} className="gap-1 rounded-[16px] border-border p-5 shadow-none">
            <p className="text-[17px] font-semibold tracking-tight">{role.label}</p>
            <p className="text-[13px] text-muted-foreground">{role.hint}</p>
            <p className="tabular mt-2 text-[13px] font-medium">
              {permissions.filter((p) => matrix[p.id]?.[role.key]).length} / {permissions.length}{" "}
              droits
            </p>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="min-w-[240px]">Permission</TableHead>
              {roles.map((role) => (
                <TableHead key={role.key} className="text-center">
                  {role.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <Fragment key={group}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={roles.length + 1}
                    className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {group}
                  </TableCell>
                </TableRow>
                {permissions
                  .filter((p) => p.group === group)
                  .map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      {roles.map((role) => {
                        const locked = role.key === "proprietaire";
                        const checked = matrix[p.id]?.[role.key] ?? false;
                        return (
                          <TableCell key={role.key} className="text-center">
                            {locked ? (
                              <span
                                className="inline-grid size-[44px] place-items-center text-success"
                                title="Toujours autorisé"
                              >
                                {checked ? (
                                  <Check className="size-[18px]" aria-label="Autorisé" />
                                ) : (
                                  <Minus className="size-[18px]" aria-label="Non autorisé" />
                                )}
                              </span>
                            ) : (
                              <span className="inline-grid size-[44px] place-items-center">
                                <Switch
                                  checked={checked}
                                  onCheckedChange={(v) => toggle(p.id, role.key, v)}
                                  aria-label={`${p.label} — ${role.label}`}
                                />
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
