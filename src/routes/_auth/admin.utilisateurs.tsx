import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KeyRound, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/admin/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Gestion des utilisateurs — BSS POS" },
      {
        name: "description",
        content:
          "Créez les comptes de votre équipe, attribuez les rôles et désactivez les accès en un geste.",
      },
      { property: "og:title", content: "Gestion des utilisateurs — BSS POS" },
      {
        property: "og:description",
        content: "Comptes, rôles et accès de l'équipe du point de vente.",
      },
    ],
  }),
  component: UsersAdminPage,
});

type RoleKey = "vendeur" | "gerant" | "proprietaire";

const roleLabels: Record<RoleKey, string> = {
  vendeur: "Vendeur",
  gerant: "Gérant",
  proprietaire: "Propriétaire",
};

type TeamUser = {
  id: number;
  name: string;
  phone: string;
  role: RoleKey;
  pointOfSale: string;
  active: boolean;
  lastSeen: string;
};

const initialUsers: TeamUser[] = [
  {
    id: 1,
    name: "Alice Ekedi",
    phone: "+237 677 00 11 22",
    role: "proprietaire",
    pointOfSale: "Centre",
    active: true,
    lastSeen: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 2,
    name: "Alice Ndongo",
    phone: "+237 699 45 12 08",
    role: "gerant",
    pointOfSale: "Centre",
    active: true,
    lastSeen: new Date(Date.now() - 7_200_000).toISOString(),
  },
  {
    id: 3,
    name: "Boris Kamga",
    phone: "+237 655 88 30 41",
    role: "vendeur",
    pointOfSale: "Akwa",
    active: true,
    lastSeen: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: 4,
    name: "Sandrine Eyenga",
    phone: "+237 690 12 77 63",
    role: "vendeur",
    pointOfSale: "Bonabéri",
    active: false,
    lastSeen: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },
];

function UsersAdminPage() {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"tous" | RoleKey>("tous");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    name: string;
    phone: string;
    role: RoleKey;
    pointOfSale: string;
  }>({ name: "", phone: "", role: "vendeur", pointOfSale: "Centre" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "tous" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const setRole = (id: number, role: RoleKey) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success(`Rôle mis à jour : ${roleLabels[role]}`);
  };

  const setActive = (id: number, active: boolean) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
    toast.success(active ? "Accès réactivé" : "Accès suspendu");
  };

  const createUser = () => {
    if (!draft.name.trim() || !draft.phone.trim()) {
      toast.error("Nom et téléphone obligatoires");
      return;
    }
    setUsers((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((u) => u.id)) + 1,
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        role: draft.role,
        pointOfSale: draft.pointOfSale,
        active: true,
        lastSeen: new Date().toISOString(),
      },
    ]);
    setDraft({ name: "", phone: "", role: "vendeur", pointOfSale: "Centre" });
    setOpen(false);
    toast.success("Utilisateur créé — code d'accès envoyé par SMS");
  };

  return (
    <PageBody>
      <PageHeader
        title="Utilisateurs"
        description="Comptes de l'équipe, rôles attribués et état des accès."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5">
                <Plus className="size-[18px]" aria-hidden />
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[16px]">
              <DialogHeader>
                <DialogTitle>Nouvel utilisateur</DialogTitle>
                <DialogDescription>
                  Un code d'accès provisoire est envoyé par SMS au numéro saisi.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-name">Nom complet</Label>
                  <Input
                    id="new-name"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    className="min-h-[44px] rounded-[10px]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-phone">Téléphone</Label>
                  <Input
                    id="new-phone"
                    inputMode="tel"
                    placeholder="+237 6.. .. .. .."
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                    className="mono min-h-[44px] rounded-[10px]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-role">Rôle</Label>
                    <Select
                      value={draft.role}
                      onValueChange={(v) => setDraft((d) => ({ ...d, role: v as RoleKey }))}
                    >
                      <SelectTrigger id="new-role" className="min-h-[44px] rounded-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendeur">Vendeur</SelectItem>
                        <SelectItem value="gerant">Gérant</SelectItem>
                        <SelectItem value="proprietaire">Propriétaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-pos">Point de vente</Label>
                    <Input
                      id="new-pos"
                      value={draft.pointOfSale}
                      onChange={(e) => setDraft((d) => ({ ...d, pointOfSale: e.target.value }))}
                      className="min-h-[44px] rounded-[10px]"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="min-h-[44px] rounded-[10px] px-6" onClick={createUser}>
                  Créer le compte
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <Search
            className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom ou un numéro"
            aria-label="Rechercher un utilisateur"
            className="min-h-[44px] rounded-[10px] pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "tous" | RoleKey)}>
          <SelectTrigger className="min-h-[44px] rounded-[10px]" aria-label="Filtrer par rôle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les rôles</SelectItem>
            <SelectItem value="vendeur">Vendeur</SelectItem>
            <SelectItem value="gerant">Gérant</SelectItem>
            <SelectItem value="proprietaire">Propriétaire</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Point de vente</TableHead>
              <TableHead className="min-w-[180px]">Rôle</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Accès</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.name}</p>
                  <p className="mono text-[13px] text-muted-foreground">{u.phone}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.pointOfSale}</TableCell>
                <TableCell>
                  {u.role === "proprietaire" ? (
                    <Badge className="border-transparent bg-primary/15 text-[11px] font-semibold text-foreground">
                      Propriétaire
                    </Badge>
                  ) : (
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v as RoleKey)}>
                      <SelectTrigger
                        className="min-h-[44px] rounded-[10px]"
                        aria-label={`Rôle de ${u.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendeur">Vendeur</SelectItem>
                        <SelectItem value="gerant">Gérant</SelectItem>
                        <SelectItem value="proprietaire">Propriétaire</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.lastSeen)}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex min-h-[44px] items-center justify-end gap-2">
                    <span className="text-[13px] text-muted-foreground">
                      {u.active ? "Actif" : "Suspendu"}
                    </span>
                    <Switch
                      checked={u.active}
                      onCheckedChange={(v) => setActive(u.id, v)}
                      aria-label={`Accès de ${u.name}`}
                      disabled={u.role === "proprietaire"}
                    />
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    className="min-h-[44px] rounded-[10px]"
                    onClick={() => toast.success(`Nouveau code envoyé à ${u.name}`)}
                  >
                    <KeyRound className="size-[18px]" aria-hidden />
                    Code
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
