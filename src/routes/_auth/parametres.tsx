import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, CreditCard, DollarSign, Eye, EyeOff, Loader2, PenLine, Plus, ShoppingBag, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { request } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgUnit {
  id: string;
  name: string;
  parent_id: string | null;
  active: boolean;
  children?: OrgUnit[];
}

interface CashRegisterApi {
  id: string;
  name: string;
  point_of_sale_id: string;
  active: boolean;
}

interface PointOfSaleApi {
  id: string;
  name: string;
  active: boolean;
  organizational_unit_id: string;
  organizational_unit?: { id: string; name: string };
  cash_registers?: CashRegisterApi[];
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const orgUnitSchema = z.object({
  name: z.string().min(2, "Nom requis (2 car. min.)"),
  parent_id: z.string().optional(),
});

const posSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  organizational_unit_id: z.string().min(1, "Unité organisationnelle requise"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nom requis"),
});

// ── Composant Points de vente ─────────────────────────────────────────────────

function PosManagementTab() {
  const qc = useQueryClient();
  const [createPosOpen, setCreatePosOpen] = useState(false);
  const [selectedPos, setSelectedPos] = useState<PointOfSaleApi | null>(null);
  const [addRegisterOpen, setAddRegisterOpen] = useState(false);
  const [editPos, setEditPos] = useState<PointOfSaleApi | null>(null);
  const [editRegister, setEditRegister] = useState<CashRegisterApi | null>(null);

  const { data: posList = [], isLoading: posLoading } = useQuery({
    queryKey: ["points-of-sale"],
    queryFn: () =>
      request<{ data: PointOfSaleApi[] }>("/commerce/points-of-sale")
        .then((r) => r.data)
        .catch(() => [] as PointOfSaleApi[]),
    staleTime: 30_000,
  });

  const { data: orgUnits = [] } = useQuery({
    queryKey: ["org-units"],
    queryFn: () =>
      request<{ data: OrgUnit[] }>("/commerce/organizational-units")
        .then((r) => r.data)
        .catch(() => [] as OrgUnit[]),
    staleTime: 60_000,
  });

  const allOrgUnits = orgUnits.flatMap((u) => [u, ...(u.children ?? [])]);

  // ── Formulaire création PDV ──────────────────────────────────────────────────
  const posForm = useForm<z.infer<typeof posSchema>>({
    resolver: zodResolver(posSchema),
    defaultValues: { name: "", organizational_unit_id: "" },
  });

  const onSubmitPos = async (values: z.infer<typeof posSchema>) => {
    try {
      await request("/commerce/points-of-sale", { method: "POST", body: values });
      toast.success("Point de vente créé");
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      void qc.invalidateQueries({ queryKey: ["cash-registers"] });
      posForm.reset();
      setCreatePosOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          posForm.setError(f as keyof z.infer<typeof posSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  // ── Formulaire renommer PDV ──────────────────────────────────────────────────
  const editPosForm = useForm<z.infer<typeof posSchema>>({
    resolver: zodResolver(posSchema),
    defaultValues: { name: "", organizational_unit_id: "" },
  });

  const openEditPos = (pos: PointOfSaleApi) => {
    setEditPos(pos);
    editPosForm.reset({ name: pos.name, organizational_unit_id: pos.organizational_unit_id });
  };

  const onSubmitEditPos = async (values: z.infer<typeof posSchema>) => {
    if (!editPos) return;
    try {
      await request(`/commerce/points-of-sale/${editPos.id}`, {
        method: "PATCH",
        body: { name: values.name },
      });
      toast.success("Point de vente mis à jour");
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      setEditPos(null);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  // ── Formulaire ajout caisse ──────────────────────────────────────────────────
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "" },
  });

  const onSubmitRegister = async (values: z.infer<typeof registerSchema>) => {
    if (!selectedPos) return;
    try {
      await request(`/commerce/points-of-sale/${selectedPos.id}/cash-registers`, {
        method: "POST",
        body: { name: values.name },
      });
      toast.success("Caisse ajoutée");
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      void qc.invalidateQueries({ queryKey: ["cash-registers"] });
      registerForm.reset();
      setAddRegisterOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          registerForm.setError(f as keyof z.infer<typeof registerSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  // ── Formulaire renommer caisse ───────────────────────────────────────────────
  const editRegisterForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "" },
  });

  const openEditRegister = (reg: CashRegisterApi) => {
    setEditRegister(reg);
    editRegisterForm.reset({ name: reg.name });
  };

  const onSubmitEditRegister = async (values: z.infer<typeof registerSchema>) => {
    if (!editRegister) return;
    try {
      await request(`/commerce/cash-registers/${editRegister.id}`, {
        method: "PATCH",
        body: { name: values.name },
      });
      toast.success("Caisse mise à jour");
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      void qc.invalidateQueries({ queryKey: ["cash-registers"] });
      setEditRegister(null);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  // ── Toggle active PDV ────────────────────────────────────────────────────────
  const togglePosActive = async (pos: PointOfSaleApi, active: boolean) => {
    try {
      await request(`/commerce/points-of-sale/${pos.id}`, { method: "PATCH", body: { active } });
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      toast.success(active ? "Point de vente activé" : "Point de vente désactivé");
    } catch {
      toast.error("Impossible de modifier le statut");
    }
  };

  // ── Toggle active caisse ─────────────────────────────────────────────────────
  const toggleRegisterActive = async (reg: CashRegisterApi, active: boolean) => {
    try {
      await request(`/commerce/cash-registers/${reg.id}`, { method: "PATCH", body: { active } });
      void qc.invalidateQueries({ queryKey: ["points-of-sale"] });
      toast.success(active ? "Caisse activée" : "Caisse désactivée");
    } catch {
      toast.error("Impossible de modifier le statut");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Points de vente</p>
          <p className="text-[13px] text-muted-foreground">
            Gérez vos boutiques et les caisses associées à chacune.
          </p>
        </div>

        {/* Sheet création PDV */}
        <Sheet open={createPosOpen} onOpenChange={(v) => { setCreatePosOpen(v); if (!v) posForm.reset(); }}>
          <SheetTrigger asChild>
            <Button className="min-h-[44px] rounded-[10px] px-5">
              <Plus className="size-4" aria-hidden />
              Nouveau PDV
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[460px]">
            <SheetHeader className="pb-4">
              <SheetTitle>Nouveau point de vente</SheetTitle>
              <SheetDescription>
                Créez une boutique et rattachez-la à une unité organisationnelle.
              </SheetDescription>
            </SheetHeader>
            <Form {...posForm}>
              <form
                onSubmit={posForm.handleSubmit(onSubmitPos)}
                className="flex flex-1 flex-col gap-4 overflow-y-auto px-1"
              >
                <FormField
                  control={posForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du point de vente</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Boutique Centre-ville, Akwa, Bonamoussadi…"
                          className="min-h-[44px] rounded-[10px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={posForm.control}
                  name="organizational_unit_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité organisationnelle</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px] rounded-[10px]">
                            <SelectValue placeholder="Choisir une unité…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allOrgUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {allOrgUnits.length === 0
                          ? "Aucune unité disponible — créez-en une dans l'onglet Organisation."
                          : "Le PDV sera rattaché à cette entité."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="mt-auto min-h-[44px] w-full rounded-[10px]"
                  disabled={posForm.formState.isSubmitting || allOrgUnits.length === 0}
                >
                  {posForm.formState.isSubmitting && (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  )}
                  Créer le point de vente
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Liste des PDV */}
      {posLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : posList.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-[16px] border-border p-10 shadow-none text-center">
          <ShoppingBag className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-[15px] font-medium">Aucun point de vente</p>
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Créez votre premier point de vente pour pouvoir ouvrir des sessions de caisse.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {posList.map((pos) => (
            <Card key={pos.id} className="gap-0 rounded-[16px] border-border p-0 shadow-none overflow-hidden">
              {/* En-tête PDV */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ShoppingBag className="size-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold">{pos.name}</p>
                    {pos.organizational_unit && (
                      <p className="text-[12px] text-muted-foreground">
                        {pos.organizational_unit.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      pos.active
                        ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                        : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                    }
                  >
                    {pos.active ? "Actif" : "Inactif"}
                  </Badge>
                  <Switch
                    checked={pos.active}
                    onCheckedChange={(v) => void togglePosActive(pos, v)}
                    aria-label={`Activer ${pos.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Renommer ${pos.name}`}
                    className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                    onClick={() => openEditPos(pos)}
                  >
                    <PenLine className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>

              {/* Caisses du PDV */}
              <div className="px-5 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Caisses
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-[8px] px-3 text-[12px]"
                    onClick={() => {
                      setSelectedPos(pos);
                      registerForm.reset();
                      setAddRegisterOpen(true);
                    }}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Ajouter
                  </Button>
                </div>

                {!pos.cash_registers || pos.cash_registers.length === 0 ? (
                  <p className="py-3 text-[13px] text-muted-foreground">
                    Aucune caisse — ajoutez-en une pour encaisser des ventes.
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {pos.cash_registers.map((reg) => (
                      <li
                        key={reg.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <CreditCard className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="text-[14px] font-medium">{reg.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              reg.active
                                ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                                : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                            }
                          >
                            {reg.active ? "Active" : "Inactive"}
                          </Badge>
                          <Switch
                            checked={reg.active}
                            onCheckedChange={(v) => void toggleRegisterActive(reg, v)}
                            aria-label={`Activer ${reg.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Renommer ${reg.name}`}
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditRegister(reg)}
                          >
                            <PenLine className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog : Ajouter une caisse */}
      <Dialog open={addRegisterOpen} onOpenChange={(v) => { setAddRegisterOpen(v); if (!v) { registerForm.reset(); setSelectedPos(null); } }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Ajouter une caisse</DialogTitle>
            <DialogDescription>
              Nouvelle caisse pour{" "}
              <span className="font-medium text-foreground">{selectedPos?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onSubmitRegister)} className="flex flex-col gap-4">
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la caisse</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Caisse 1 — Comptoir, Caisse Mobile…"
                        className="min-h-[44px] rounded-[10px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Ajouter la caisse
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog : Renommer PDV */}
      <Dialog open={editPos !== null} onOpenChange={(v) => { if (!v) setEditPos(null); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Renommer le point de vente</DialogTitle>
            <DialogDescription>Modifier le nom affiché dans l'application.</DialogDescription>
          </DialogHeader>
          <Form {...editPosForm}>
            <form onSubmit={editPosForm.handleSubmit(onSubmitEditPos)} className="flex flex-col gap-4">
              <FormField
                control={editPosForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input className="min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={editPosForm.formState.isSubmitting}>
                  {editPosForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog : Renommer caisse */}
      <Dialog open={editRegister !== null} onOpenChange={(v) => { if (!v) setEditRegister(null); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Renommer la caisse</DialogTitle>
            <DialogDescription>Modifier le nom affiché lors de l'ouverture de session.</DialogDescription>
          </DialogHeader>
          <Form {...editRegisterForm}>
            <form onSubmit={editRegisterForm.handleSubmit(onSubmitEditRegister)} className="flex flex-col gap-4">
              <FormField
                control={editRegisterForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input className="min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={editRegisterForm.formState.isSubmitting}>
                  {editRegisterForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Paiements ─────────────────────────────────────────────────────────────────

interface BackendPaymentMethod {
  id: string;
  key: string;
  label: string;
  active: boolean;
}

const pmSchema = z.object({
  key:   z.string().min(1, "Code requis"),
  label: z.string().min(2, "Libellé requis"),
});

function PaymentMethodsTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payment-methods-settings"],
    queryFn: () =>
      request<{ data: BackendPaymentMethod[] }>("/commerce/payment-methods")
        .then((r) => r.data)
        .catch(() => [] as BackendPaymentMethod[]),
    staleTime: 30_000,
  });

  const form = useForm<z.infer<typeof pmSchema>>({
    resolver: zodResolver(pmSchema),
    defaultValues: { key: "", label: "" },
  });

  const onSubmit = async (values: z.infer<typeof pmSchema>) => {
    try {
      await request("/commerce/payment-methods", { method: "POST", body: values });
      toast.success("Mode de paiement créé");
      void qc.invalidateQueries({ queryKey: ["payment-methods-settings"] });
      form.reset();
      setAddOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof pmSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  const toggleActive = async (pm: BackendPaymentMethod, active: boolean) => {
    try {
      await request(`/commerce/payment-methods/${pm.id}`, { method: "PUT", body: { ...pm, active } });
      void qc.invalidateQueries({ queryKey: ["payment-methods-settings"] });
      toast.success(active ? "Mode activé" : "Mode désactivé");
    } catch {
      toast.error("Impossible de modifier");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Modes de paiement</p>
          <p className="text-[13px] text-muted-foreground">
            Modes acceptés en caisse : espèces, Mobile Money, carte…
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) form.reset(); }}>
          <Button className="min-h-[44px] rounded-[10px] px-5" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Ajouter
          </Button>
          <DialogContent className="rounded-[16px]">
            <DialogHeader>
              <DialogTitle>Nouveau mode de paiement</DialogTitle>
              <DialogDescription>Ajoutez un moyen de règlement disponible en caisse.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code interne</FormLabel>
                      <FormControl>
                        <Input placeholder="mobile_money, carte, cheque…" className="mono min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Libellé affiché</FormLabel>
                      <FormControl>
                        <Input placeholder="Mobile Money, Carte bancaire…" className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <Card className="gap-0 rounded-[16px] border-border p-0 shadow-none overflow-hidden">
          <ul className="divide-y divide-border">
            {methods.map((pm) => (
              <li key={pm.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <CreditCard className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium">{pm.label}</p>
                    <p className="mono text-[12px] text-muted-foreground">{pm.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      pm.active
                        ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                        : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                    }
                  >
                    {pm.active ? "Actif" : "Inactif"}
                  </Badge>
                  <Switch
                    checked={pm.active}
                    onCheckedChange={(v) => void toggleActive(pm, v)}
                    aria-label={`Activer ${pm.label}`}
                  />
                </div>
              </li>
            ))}
            {methods.length === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                Aucun mode de paiement configuré.
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ── Devises ───────────────────────────────────────────────────────────────────

interface BackendCurrency {
  id: string;
  code: string;
  name: string;
  rate: number;
  is_default: boolean;
}

const currencySchema = z.object({
  code: z.string().min(2, "Code requis").max(5),
  name: z.string().min(2, "Nom requis"),
  rate: z.coerce.number().min(0.0001, "Taux requis"),
});

const rateSchema = z.object({ rate: z.coerce.number().min(0.0001, "Taux requis") });

function CurrenciesTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editCurrency, setEditCurrency] = useState<BackendCurrency | null>(null);

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: () =>
      request<{ data: BackendCurrency[] }>("/commerce/currencies")
        .then((r) => r.data)
        .catch(() => [] as BackendCurrency[]),
    staleTime: 60_000,
  });

  const addForm = useForm<z.infer<typeof currencySchema>>({
    resolver: zodResolver(currencySchema),
    defaultValues: { code: "", name: "", rate: 1 },
  });

  const rateForm = useForm<z.infer<typeof rateSchema>>({
    resolver: zodResolver(rateSchema),
    defaultValues: { rate: 1 },
  });

  const onSubmitAdd = async (values: z.infer<typeof currencySchema>) => {
    try {
      await request("/commerce/currencies", { method: "POST", body: values });
      toast.success("Devise créée");
      void qc.invalidateQueries({ queryKey: ["currencies"] });
      addForm.reset();
      setAddOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          addForm.setError(f as keyof z.infer<typeof currencySchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  const onSubmitRate = async (values: z.infer<typeof rateSchema>) => {
    if (!editCurrency) return;
    try {
      await request(`/commerce/currencies/${editCurrency.id}`, {
        method: "PUT",
        body: { rate: values.rate },
      });
      toast.success("Taux mis à jour");
      void qc.invalidateQueries({ queryKey: ["currencies"] });
      setEditCurrency(null);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Devises</p>
          <p className="text-[13px] text-muted-foreground">
            Gérez les devises acceptées et leurs taux de conversion.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) addForm.reset(); }}>
          <Button className="min-h-[44px] rounded-[10px] px-5" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Nouvelle devise
          </Button>
          <DialogContent className="rounded-[16px]">
            <DialogHeader>
              <DialogTitle>Nouvelle devise</DialogTitle>
              <DialogDescription>Ajoutez une devise avec son taux de conversion vers XAF.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onSubmitAdd)} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={addForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code ISO</FormLabel>
                        <FormControl>
                          <Input placeholder="EUR, USD, GBP…" className="mono min-h-[44px] rounded-[10px] uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taux (1 devise = ? XAF)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.0001" min="0" className="tabular min-h-[44px] rounded-[10px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Euro, Dollar américain…" className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={addForm.formState.isSubmitting}>
                    {addForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : (
        <Card className="gap-0 rounded-[16px] border-border p-0 shadow-none overflow-hidden">
          <ul className="divide-y divide-border">
            {currencies.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <DollarSign className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="mono font-semibold">{c.code}</p>
                      {c.is_default && (
                        <Badge className="border-transparent bg-primary/10 text-[10px] font-semibold text-primary">
                          Principale
                        </Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground">{c.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="tabular text-[13px] font-medium">{c.rate} XAF</p>
                  {!c.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier le taux de ${c.code}`}
                      className="size-9 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditCurrency(c); rateForm.reset({ rate: c.rate }); }}
                    >
                      <PenLine className="size-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
            {currencies.length === 0 && (
              <li className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                Aucune devise configurée.
              </li>
            )}
          </ul>
        </Card>
      )}

      {/* Dialog modifier taux */}
      <Dialog open={editCurrency !== null} onOpenChange={(v) => { if (!v) setEditCurrency(null); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Modifier le taux — {editCurrency?.code}</DialogTitle>
            <DialogDescription>Taux de conversion vers XAF.</DialogDescription>
          </DialogHeader>
          <Form {...rateForm}>
            <form onSubmit={rateForm.handleSubmit(onSubmitRate)} className="flex flex-col gap-4">
              <FormField
                control={rateForm.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1 {editCurrency?.code} = ? XAF</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" min="0" className="tabular min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={rateForm.formState.isSubmitting}>
                  {rateForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Équipe ────────────────────────────────────────────────────────────────────

interface BackendTeamMember {
  id: string;
  name: string;
  phone?: string | null;
  role: "vendeur" | "gerant" | "proprietaire";
  active: boolean;
}

const createMemberSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  role: z.enum(["vendeur", "gerant", "proprietaire"]),
  password: z.string().min(8, "8 caractères minimum"),
  password_confirmation: z.string().min(1, "Requis"),
}).refine((d) => d.password === d.password_confirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["password_confirmation"],
});

const editMemberSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  role: z.enum(["vendeur", "gerant", "proprietaire"]),
});

const ROLE_LABEL: Record<string, string> = {
  vendeur: "Vendeur",
  gerant: "Gérant",
  proprietaire: "Propriétaire",
};

const ROLE_CLASS: Record<string, string> = {
  vendeur:      "border-transparent bg-muted text-[11px] font-semibold text-foreground",
  gerant:       "border-transparent bg-primary/10 text-[11px] font-semibold text-primary",
  proprietaire: "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground",
};

type CreateMemberValues = z.infer<typeof createMemberSchema>;
type EditMemberValues = z.infer<typeof editMemberSchema>;

function TeamTab() {
  const [members, setMembers] = useState<BackendTeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<BackendTeamMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<BackendTeamMember | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load from backend once on mount
  useQuery({
    queryKey: ["team-members"],
    queryFn: () =>
      request<{ data: BackendTeamMember[] }>("/commerce/users")
        .then((r) => { setMembers(r.data); setLoaded(true); return r.data; })
        .catch(() => { setLoaded(true); return [] as BackendTeamMember[]; }),
    staleTime: Infinity,
    enabled: !loaded,
  });

  const createForm = useForm<CreateMemberValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { name: "", phone: "", role: "vendeur", password: "", password_confirmation: "" },
  });

  const editForm = useForm<EditMemberValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: { name: "", phone: "", role: "vendeur" },
  });

  const openEdit = (m: BackendTeamMember) => {
    setEditMember(m);
    editForm.reset({ name: m.name, phone: m.phone ?? "", role: m.role });
  };

  const onSubmitCreate = async (values: CreateMemberValues) => {
    try {
      const created = await request<BackendTeamMember>("/commerce/users", { method: "POST", body: values });
      setMembers((prev) => [...prev, created]);
      createForm.reset();
      setAddOpen(false);
      toast.success("Membre ajouté");
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          createForm.setError(f as keyof CreateMemberValues, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  const onSubmitEdit = async (values: EditMemberValues) => {
    if (!editMember) return;
    // Optimistic: update local list immediately
    setMembers((prev) =>
      prev.map((m) =>
        m.id === editMember.id
          ? { ...m, name: values.name, role: values.role, phone: values.phone ?? null }
          : m,
      ),
    );
    setEditMember(null);
    toast.success("Membre mis à jour");
    // Sync to backend silently
    request(`/commerce/users/${editMember.id}`, { method: "PUT", body: values }).catch(() => undefined);
  };

  const toggleActive = (m: BackendTeamMember, active: boolean) => {
    setMembers((prev) => prev.map((u) => u.id === m.id ? { ...u, active } : u));
    toast.success(active ? "Membre activé" : "Membre désactivé");
    request(`/commerce/users/${m.id}`, { method: "PATCH", body: { active } }).catch(() => undefined);
  };

  const confirmDelete = () => {
    if (!deleteMember) return;
    setDeleting(true);
    setMembers((prev) => prev.filter((m) => m.id !== deleteMember.id));
    toast.success(`${deleteMember.name} supprimé`);
    request(`/commerce/users/${deleteMember.id}`, { method: "DELETE" }).catch(() => undefined);
    setDeleteMember(null);
    setDeleting(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium">Équipe</p>
          <p className="text-[13px] text-muted-foreground">
            Gérez les accès de vos collaborateurs au point de vente.
          </p>
        </div>

        <Sheet
          open={addOpen}
          onOpenChange={(v) => {
            setAddOpen(v);
            if (!v) { createForm.reset(); setShowPassword(false); setShowConfirm(false); }
          }}
        >
          <SheetTrigger asChild>
            <Button className="min-h-[44px] rounded-[10px] px-5">
              <UserPlus className="size-4" aria-hidden />
              Ajouter
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[460px]">
            <SheetHeader className="pb-4">
              <SheetTitle>Nouveau membre</SheetTitle>
              <SheetDescription>Créez un compte pour un vendeur ou un gérant.</SheetDescription>
            </SheetHeader>
            <Form {...createForm}>
              <form
                onSubmit={createForm.handleSubmit(onSubmitCreate)}
                className="flex flex-1 flex-col gap-4 overflow-y-auto px-1"
              >
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Prénom Nom" className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+237 6XX XX XX XX" className="mono min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
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
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="8 caractères minimum"
                            className="min-h-[44px] rounded-[10px] pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Masquer" : "Afficher"}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password_confirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Répétez le mot de passe"
                            className="min-h-[44px] rounded-[10px] pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowConfirm((v) => !v)}
                            aria-label={showConfirm ? "Masquer" : "Afficher"}
                          >
                            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="mt-auto min-h-[44px] w-full rounded-[10px]"
                  disabled={createForm.formState.isSubmitting}
                >
                  {createForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Créer le compte
                </Button>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </div>

      {!loaded ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : members.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-[16px] border-border p-10 shadow-none text-center">
          <Users className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-[15px] font-medium">Aucun membre</p>
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Ajoutez des collaborateurs pour leur donner accès au point de vente.
          </p>
        </Card>
      ) : (
        <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="mono text-[12px] text-muted-foreground">{m.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_CLASS[m.role] ?? ROLE_CLASS["vendeur"]}>
                      {ROLE_LABEL[m.role] ?? m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={m.active}
                      onCheckedChange={(v) => void toggleActive(m, v)}
                      aria-label={`Activer ${m.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier ${m.name}`}
                        className="size-9 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(m)}
                      >
                        <PenLine className="size-3.5" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${m.name}`}
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteMember(m)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog : Modifier un membre */}
      <Dialog open={editMember !== null} onOpenChange={(v) => { if (!v) setEditMember(null); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Modifier le membre</DialogTitle>
            <DialogDescription>{editMember?.name}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="flex flex-col gap-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input className="mono min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
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
              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={editForm.formState.isSubmitting}>
                  {editForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog : Confirmer la suppression */}
      <Dialog open={deleteMember !== null} onOpenChange={(v) => { if (!v) setDeleteMember(null); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Supprimer ce membre ?</DialogTitle>
            <DialogDescription>
              <strong>{deleteMember?.name}</strong> n'aura plus accès au point de vente.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => setDeleteMember(null)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px] rounded-[10px]"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/_auth/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres boutique — BSS POS" },
      {
        name: "description",
        content: "Configurez la boutique, la TVA, les tickets, l'équipe et les moyens de paiement.",
      },
      { property: "og:title", content: "Paramètres boutique — BSS POS" },
      { property: "og:description", content: "Adaptez le point de vente à votre organisation." },
    ],
  }),
  component: SettingsPage,
});

const shopSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  phone: z.string().min(8, "Téléphone invalide"),
  vat_rate: z.coerce.number().min(0).max(100),
  city: z.string().min(2, "Ville requise"),
});

const ticketSchema = z.object({
  auto_print: z.boolean(),
  footer_message: z.string(),
});

function ShopForm() {
  const form = useForm<z.infer<typeof shopSchema>>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "BSS Électronique — Centre",
      phone: "+237 233 42 00 00",
      vat_rate: 19,
      city: "Douala",
    },
  });

  const onSubmit = async (values: z.infer<typeof shopSchema>) => {
    try {
      await request("/commerce/invoice-settings", { method: "PUT", body: values });
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la boutique</FormLabel>
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
                    <Input className="mono min-h-[44px] rounded-[10px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vat_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux de TVA (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" max="100" className="tabular min-h-[44px] rounded-[10px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <Input className="min-h-[44px] rounded-[10px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="min-h-[44px] w-fit rounded-[10px] px-6"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Enregistrer
          </Button>
        </Card>
      </form>
    </Form>
  );
}

function TicketForm() {
  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      auto_print: true,
      footer_message: "Merci de votre confiance — garantie 12 mois",
    },
  });

  const onSubmit = async (values: z.infer<typeof ticketSchema>) => {
    try {
      await request("/commerce/invoice-settings", { method: "PUT", body: values });
      toast.success("Ticket mis à jour");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <FormField
            control={form.control}
            name="auto_print"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <FormLabel className="text-[15px] font-medium">Imprimer automatiquement le ticket</FormLabel>
                  <FormDescription>Lance l'impression dès la validation du paiement.</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="footer_message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message de bas de ticket</FormLabel>
                <FormControl>
                  <Input className="min-h-[44px] rounded-[10px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="min-h-[44px] w-fit rounded-[10px] px-6"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Enregistrer
          </Button>
        </Card>
      </form>
    </Form>
  );
}

function OrgUnitsTab() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["org-units"],
    queryFn: () =>
      request<{ data: OrgUnit[] }>("/commerce/organizational-units")
        .then((r) => r.data)
        .catch(() => [] as OrgUnit[]),
    staleTime: 30_000,
  });

  const form = useForm<z.infer<typeof orgUnitSchema>>({
    resolver: zodResolver(orgUnitSchema),
    defaultValues: { name: "", parent_id: undefined },
  });

  const onSubmit = async (values: z.infer<typeof orgUnitSchema>) => {
    try {
      await request("/commerce/organizational-units", {
        method: "POST",
        body: {
          name: values.name,
          ...(values.parent_id ? { parent_id: values.parent_id } : {}),
        },
      });
      toast.success("Unité créée avec succès");
      void qc.invalidateQueries({ queryKey: ["org-units"] });
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof orgUnitSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  const deactivate = async (id: string, name: string) => {
    try {
      await request(`/commerce/organizational-units/${id}`, { method: "DELETE" });
      toast.success(`"${name}" désactivée`);
      void qc.invalidateQueries({ queryKey: ["org-units"] });
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible de supprimer cette unité");
    }
  };

  const allFlat = units.flatMap((u) => [u, ...(u.children ?? [])]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] font-medium">Unités organisationnelles</p>
          <p className="text-[13px] text-muted-foreground">
            Hiérarchie de votre réseau (siège, régions, zones). Chaque point de vente est rattaché à une unité.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px] rounded-[10px] px-5">
              <Plus className="size-4" aria-hidden />
              Nouvelle unité
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[16px]">
            <DialogHeader>
              <DialogTitle>Nouvelle unité organisationnelle</DialogTitle>
              <DialogDescription>
                Créez une entité (siège, région, zone) à laquelle rattacher des points de vente.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'unité</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Siège social, Zone Nord, Région Littoral…"
                          className="min-h-[44px] rounded-[10px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité parente (optionnel)</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v || undefined)}
                      >
                        <FormControl>
                          <SelectTrigger className="min-h-[44px] rounded-[10px]">
                            <SelectValue placeholder="Aucune (unité racine)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Aucune (unité racine)</SelectItem>
                          {allFlat.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Laissez vide pour créer une unité de premier niveau.
                      </FormDescription>
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
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : units.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-[16px] border-border p-10 shadow-none text-center">
          <Building2 className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-[15px] font-medium">Aucune unité organisationnelle</p>
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Créez votre première unité (siège, région…) pour pouvoir ensuite créer des points de vente.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {units.map((unit) => (
            <Card key={unit.id} className="gap-0 rounded-[16px] border-border p-4 shadow-none">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Building2 className="size-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold">{unit.name}</p>
                    {unit.children && unit.children.length > 0 && (
                      <p className="text-[12px] text-muted-foreground">
                        {unit.children.length} sous-unité{unit.children.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Désactiver ${unit.name}`}
                  className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                  onClick={() => void deactivate(unit.id, unit.name)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>

              {unit.children && unit.children.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                  {unit.children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between gap-2 pl-6">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">↳</span>
                        <span className="text-[14px]">{child.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Désactiver ${child.name}`}
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void deactivate(child.id, child.name)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  return (
    <PageBody>
      <PageHeader title="Paramètres" description="Configuration de la boutique et de l'équipe." />

      <Tabs defaultValue="boutique">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="boutique" className="min-h-[36px]">Boutique</TabsTrigger>
          <TabsTrigger value="ticket" className="min-h-[36px]">Ticket</TabsTrigger>
          <TabsTrigger value="pdv" className="min-h-[36px]">Points de vente</TabsTrigger>
          <TabsTrigger value="organisation" className="min-h-[36px]">Organisation</TabsTrigger>
          <TabsTrigger value="paiements" className="min-h-[36px]">Paiements</TabsTrigger>
          <TabsTrigger value="devises" className="min-h-[36px]">Devises</TabsTrigger>
          <TabsTrigger value="equipe" className="min-h-[36px]">Équipe</TabsTrigger>
        </TabsList>

        <TabsContent value="boutique" className="pt-4">
          <ShopForm />
        </TabsContent>

        <TabsContent value="ticket" className="pt-4">
          <TicketForm />
        </TabsContent>

        <TabsContent value="pdv" className="pt-4">
          <PosManagementTab />
        </TabsContent>

        <TabsContent value="organisation" className="pt-4">
          <OrgUnitsTab />
        </TabsContent>

        <TabsContent value="paiements" className="pt-4">
          <PaymentMethodsTab />
        </TabsContent>

        <TabsContent value="devises" className="pt-4">
          <CurrenciesTab />
        </TabsContent>

        <TabsContent value="equipe" className="pt-4">
          <TeamTab />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}
