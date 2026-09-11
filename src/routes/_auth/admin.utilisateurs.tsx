import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, KeyRound, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleKey = "vendeur" | "gerant" | "proprietaire";

const roleLabels: Record<RoleKey, string> = {
  vendeur: "Vendeur",
  gerant: "Gérant",
  proprietaire: "Propriétaire",
};

interface PosRef {
  id: string;
  name: string;
  active?: boolean;
  cash_registers?: unknown[];
}

interface BackendUser {
  id: string;
  name: string;
  phone: string;
  role: RoleKey;
  points_of_sale: PosRef[];
  active: boolean;
  last_seen_at?: string | null;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name:              z.string().min(2, "Nom complet requis"),
  phone:             z.string().min(8, "Numéro invalide"),
  role:              z.enum(["vendeur", "gerant", "proprietaire"]),
  point_of_sale_ids: z.array(z.string()).min(0),
});

// ── Route ─────────────────────────────────────────────────────────────────────

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

// ── POS chips cell ─────────────────────────────────────────────────────────────

function PosCellProps({
  user,
  allPos,
}: {
  user: BackendUser;
  allPos: PosRef[];
}) {
  const qc = useQueryClient();
  const [popOpen, setPopOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (user.role === "proprietaire") {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
        <Building2 className="size-3.5" />
        Toutes
      </span>
    );
  }

  const assignedIds = new Set(user.points_of_sale.map((p) => p.id));
  const available = allPos.filter((p) => !assignedIds.has(p.id));

  const unassign = async (posId: string) => {
    setBusy(posId);
    try {
      await request(`/commerce/users/${user.id}/points-of-sale/${posId}`, { method: "DELETE" });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
    } catch {
      toast.error("Impossible de retirer la boutique");
    } finally {
      setBusy(null);
    }
  };

  const assign = async (posId: string) => {
    setBusy(posId);
    try {
      await request(`/commerce/users/${user.id}/points-of-sale`, {
        method: "POST",
        body: { point_of_sale_id: posId },
      });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      setPopOpen(false);
    } catch {
      toast.error("Impossible d'affecter la boutique");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {user.points_of_sale.map((p) => (
        <span
          key={p.id}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[12px] font-medium"
        >
          {p.name}
          <button
            type="button"
            aria-label={`Retirer ${p.name}`}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
            disabled={busy === p.id}
            onClick={() => void unassign(p.id)}
          >
            {busy === p.id ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : (
              <X className="size-2.5" />
            )}
          </button>
        </span>
      ))}

      {available.length > 0 && (
        <Popover open={popOpen} onOpenChange={setPopOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Affecter une boutique"
              className="inline-flex size-[22px] items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-1">
            {available.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy === p.id}
                onClick={() => void assign(p.id)}
                className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-[13px] text-left hover:bg-secondary disabled:opacity-50"
              >
                {busy === p.id ? (
                  <Loader2 className="size-3.5 animate-spin shrink-0 text-muted-foreground" />
                ) : (
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                {p.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {user.points_of_sale.length === 0 && available.length === 0 && (
        <span className="text-[13px] text-muted-foreground">—</span>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function UsersAdminPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"tous" | RoleKey>("tous");
  const [open, setOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () =>
      request<{ data: BackendUser[] }>("/commerce/users")
        .then((r) => r.data)
        .catch(() => [] as BackendUser[]),
    staleTime: 30_000,
  });

  const { data: allPos = [] } = useQuery({
    queryKey: ["points-of-sale-all"],
    queryFn: () =>
      request<{ data: PosRef[] }>("/commerce/points-of-sale").then((r) => r.data),
    staleTime: 60_000,
  });

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", phone: "", role: "vendeur", point_of_sale_ids: [] },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "tous" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const setRole = async (id: string, role: RoleKey) => {
    try {
      await request(`/commerce/users/${id}`, { method: "PATCH", body: { role } });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Rôle mis à jour : ${roleLabels[role]}`);
    } catch {
      toast.error("Impossible de modifier le rôle");
    }
  };

  const setActive = async (id: string, active: boolean) => {
    try {
      await request(`/commerce/users/${id}`, { method: "PATCH", body: { active } });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(active ? "Accès réactivé" : "Accès suspendu");
    } catch {
      toast.error("Impossible de modifier l'accès");
    }
  };

  const onSubmit = async (values: z.infer<typeof createUserSchema>) => {
    try {
      await request("/commerce/users", {
        method: "POST",
        body: {
          name:              values.name,
          phone:             values.phone,
          role:              values.role,
          point_of_sale_ids: values.point_of_sale_ids,
        },
      });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      form.reset();
      setOpen(false);
      toast.success("Utilisateur créé");
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof createUserSchema>, {
            message: msgs[0] ?? "Invalide",
          }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Utilisateurs"
        description="Comptes de l'équipe, rôles attribués et boutiques associées."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
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
                  Le mot de passe initial est le numéro de téléphone.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input className="min-h-[44px] rounded-[10px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="tel"
                            placeholder="+237 6.. .. .. .."
                            className="mono min-h-[44px] rounded-[10px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rôle</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="min-h-[44px] rounded-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vendeur">Vendeur</SelectItem>
                            <SelectItem value="gerant">Gérant</SelectItem>
                            <SelectItem value="proprietaire">Propriétaire</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Boutiques — multi-select via checkboxes */}
                  {allPos.length > 0 && (
                    <FormField
                      control={form.control}
                      name="point_of_sale_ids"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Boutiques affectées</FormLabel>
                          <div className="flex flex-col gap-2">
                            {allPos.map((p) => {
                              const checked = field.value.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-primary"
                                    checked={checked}
                                    onChange={(e) => {
                                      field.onChange(
                                        e.target.checked
                                          ? [...field.value, p.id]
                                          : field.value.filter((id) => id !== p.id),
                                      );
                                    }}
                                  />
                                  <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                  <span className="text-[14px]">{p.name}</span>
                                </label>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <DialogFooter>
                    <Button
                      type="submit"
                      className="min-h-[44px] rounded-[10px] px-6"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      )}
                      Créer le compte
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
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
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as "tous" | RoleKey)}
        >
          <SelectTrigger
            className="min-h-[44px] rounded-[10px]"
            aria-label="Filtrer par rôle"
          >
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

      {/* Table */}
      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Boutiques</TableHead>
              <TableHead className="min-w-[180px]">Rôle</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Accès</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.name}</p>
                    <p className="mono text-[13px] text-muted-foreground">{u.phone}</p>
                  </TableCell>
                  <TableCell>
                    <PosCellProps user={u} allPos={allPos} />
                  </TableCell>
                  <TableCell>
                    {u.role === "proprietaire" ? (
                      <Badge className="border-transparent bg-primary/15 text-[11px] font-semibold text-foreground">
                        Propriétaire
                      </Badge>
                    ) : (
                      <Select
                        value={u.role}
                        onValueChange={(v) => void setRole(u.id, v as RoleKey)}
                      >
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
                  <TableCell className="text-muted-foreground">
                    {u.last_seen_at ? formatDate(u.last_seen_at) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex min-h-[44px] items-center justify-end gap-2">
                      <span className="text-[13px] text-muted-foreground">
                        {u.active ? "Actif" : "Suspendu"}
                      </span>
                      <Switch
                        checked={u.active}
                        onCheckedChange={(v) => void setActive(u.id, v)}
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
              ))
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun utilisateur ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
