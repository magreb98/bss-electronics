import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldCheck, Users } from "lucide-react";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_auth/admin/")({
  head: () => ({
    meta: [
      { title: "Administration — BSS POS" },
      {
        name: "description",
        content: "Facturation, rôles et utilisateurs : centre d'administration de la boutique.",
      },
      { property: "og:title", content: "Administration — BSS POS" },
      {
        property: "og:description",
        content: "Gérez la facturation, les rôles et les comptes de votre équipe.",
      },
    ],
  }),
  component: AdminHome,
});

const sections = [
  {
    to: "/admin/facturation",
    title: "Facturation",
    description: "Entête, TVA, numérotation et mentions légales des factures.",
    icon: FileText,
  },
  {
    to: "/admin/roles",
    title: "Rôles et permissions",
    description: "Droits des vendeurs, gérants et propriétaires.",
    icon: ShieldCheck,
  },
  {
    to: "/admin/utilisateurs",
    title: "Utilisateurs",
    description: "Comptes de l'équipe, activation et réinitialisation.",
    icon: Users,
  },
] as const;

function AdminHome() {
  return (
    <PageBody>
      <PageHeader
        title="Administration"
        description="Réglages avancés réservés au propriétaire et aux gérants."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="rounded-[16px]">
            <Card className="h-full gap-2 rounded-[16px] border-border p-5 shadow-none transition-colors duration-150 hover:bg-muted">
              <div className="grid size-10 place-items-center rounded-[10px] bg-primary/10 text-primary">
                <s.icon className="size-5" aria-hidden />
              </div>
              <p className="text-[17px] font-semibold tracking-tight">{s.title}</p>
              <p className="text-[13px] leading-[1.6] text-muted-foreground">{s.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageBody>
  );
}
