import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { UseFormReturn } from "react-hook-form";
import { Gift, Loader2, PenLine, Plus, Tag, Ticket } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { request } from "@/lib/api";
import { adaptPromotions } from "@/lib/adapters";
import { formatDate } from "@/lib/format";
import type { BackendPromotion, Promotion } from "@/lib/types";

export const Route = createFileRoute("/_auth/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & coupons — BSS POS" },
      {
        name: "description",
        content: "Créez remises, coupons et campagnes promotionnelles applicables en caisse.",
      },
      { property: "og:title", content: "Promotions & coupons — BSS POS" },
      { property: "og:description", content: "Boostez vos ventes avec des offres ciblées." },
    ],
  }),
  component: PromotionsPage,
});

// ── Schemas ────────────────────────────────────────────────────────────────────

const promoSchema = z.object({
  name:       z.string().min(2, "Nom requis"),
  type:       z.enum(["percent", "fixed_amount"]),
  scope:      z.enum(["product", "family"]),
  value:      z.coerce.number().int().min(1, "Valeur requise"),
  cumulative: z.boolean(),
  starts_at:  z.string().optional(),
  ends_at:    z.string().optional(),
});

const couponSchema = z.object({
  code:      z.string().min(1, "Code requis").max(50),
  max_uses:  z.coerce.number().int().min(1).optional(),
});

function PromotionsPage() {
  const qc = useQueryClient();
  const [createOpen,  setCreateOpen]  = useState(false);
  const [editPromo,   setEditPromo]   = useState<Promotion | null>(null);
  const [couponPromo, setCouponPromo] = useState<Promotion | null>(null);

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn:  () =>
      request<{ data: BackendPromotion[] }>("/commerce/promotions?include_inactive=true")
        .then((r) => adaptPromotions(r.data))
        .catch(() => [] as Promotion[]),
    staleTime: 30_000,
  });

  // ── Formulaire création ─────────────────────────────────────────────────────

  const createForm = useForm<z.infer<typeof promoSchema>>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      name:       "",
      type:       "percent",
      scope:      "product",
      value:      10,
      cumulative: false,
      starts_at:  new Date().toISOString().slice(0, 10),
      ends_at:    new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    },
  });

  const onSubmitCreate = async (values: z.infer<typeof promoSchema>) => {
    try {
      await request("/commerce/promotions", {
        method: "POST",
        body: {
          name:       values.name,
          type:       values.type,
          scope:      values.scope,
          scope_id:   null,
          value:      values.value,
          cumulative: values.cumulative,
          ...(values.starts_at ? { starts_at: values.starts_at } : {}),
          ...(values.ends_at   ? { ends_at:   values.ends_at   } : {}),
        },
      });
      toast.success("Promotion créée");
      void qc.invalidateQueries({ queryKey: ["promotions"] });
      createForm.reset();
      setCreateOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          createForm.setError(f as keyof z.infer<typeof promoSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  // ── Formulaire édition ──────────────────────────────────────────────────────

  const editForm = useForm<z.infer<typeof promoSchema>>({
    resolver: zodResolver(promoSchema),
    defaultValues: { name: "", type: "percent", scope: "product", value: 10, cumulative: false },
  });

  const openEdit = (p: Promotion) => {
    setEditPromo(p);
    editForm.reset({
      name:       p.name,
      type:       p.type,
      scope:      p.scope,
      value:      p.value,
      cumulative: p.cumulative,
      starts_at:  p.starts_at?.slice(0, 10) ?? "",
      ends_at:    p.ends_at?.slice(0, 10) ?? "",
    });
  };

  const onSubmitEdit = async (values: z.infer<typeof promoSchema>) => {
    if (!editPromo) return;
    try {
      await request(`/commerce/promotions/${editPromo.id}`, {
        method: "PUT",
        body: { name: values.name, value: values.value, cumulative: values.cumulative, starts_at: values.starts_at, ends_at: values.ends_at },
      });
      toast.success("Promotion mise à jour");
      void qc.invalidateQueries({ queryKey: ["promotions"] });
      setEditPromo(null);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  // ── Toggle active ───────────────────────────────────────────────────────────

  const toggleActive = async (p: Promotion, active: boolean) => {
    try {
      await request(`/commerce/promotions/${p.id}`, { method: "PATCH", body: { active } });
      void qc.invalidateQueries({ queryKey: ["promotions"] });
      toast.success(active ? "Promotion activée" : "Promotion désactivée");
    } catch {
      toast.error("Impossible de modifier");
    }
  };

  // ── Coupons ─────────────────────────────────────────────────────────────────

  const couponForm = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: "", max_uses: undefined },
  });

  const onSubmitCoupons = async (values: z.infer<typeof couponSchema>) => {
    if (!couponPromo) return;
    try {
      await request(`/commerce/promotions/${couponPromo.id}/coupons`, {
        method: "POST",
        body: {
          code: values.code,
          ...(values.max_uses ? { max_uses: values.max_uses } : {}),
        },
      });
      toast.success("Coupon créé");
      couponForm.reset();
      setCouponPromo(null);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          couponForm.setError(f as keyof z.infer<typeof couponSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  // ── Formulaire partagé (création + édition) ─────────────────────────────────

  type PromoValues = z.infer<typeof promoSchema>;

  function PromoForm({
    form,
    onSubmit,
    submitLabel,
    showScope = true,
  }: {
    form: UseFormReturn<PromoValues>;
    onSubmit: (v: PromoValues) => Promise<void>;
    submitLabel: string;
    showScope?: boolean;
  }) {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la promotion</FormLabel>
              <FormControl><Input placeholder="Rentrée scolaire -10%" className="min-h-[44px] rounded-[10px]" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type de remise</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="min-h-[44px] rounded-[10px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="percent">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Montant fixe (XAF)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="value" render={({ field }) => (
              <FormItem>
                <FormLabel>Valeur ({form.watch("type") === "percent" ? "%" : "XAF"})</FormLabel>
                <FormControl><Input type="number" step="1" min="1" className="tabular min-h-[44px] rounded-[10px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {showScope && (
            <FormField control={form.control} name="scope" render={({ field }) => (
              <FormItem>
                <FormLabel>Portée</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="min-h-[44px] rounded-[10px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="product">Par produit</SelectItem>
                    <SelectItem value="family">Par famille</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="starts_at" render={({ field }) => (
              <FormItem>
                <FormLabel>Début</FormLabel>
                <FormControl><Input type="date" className="min-h-[44px] rounded-[10px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ends_at" render={({ field }) => (
              <FormItem>
                <FormLabel>Fin</FormLabel>
                <FormControl><Input type="date" className="min-h-[44px] rounded-[10px]" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="cumulative" render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-[10px] border border-input px-4 py-3">
              <FormLabel className="cursor-pointer font-normal">Cumulable avec d'autres promotions</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )} />

          <Button type="submit" className="mt-auto min-h-[44px] w-full rounded-[10px]" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="Promotions"
        description="Campagnes actives et coupons utilisables en caisse."
        action={
          <Sheet open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) createForm.reset(); }}>
            <SheetTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouvelle promotion
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[480px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Nouvelle promotion</SheetTitle>
                <SheetDescription>Définissez le type, la valeur et la période.</SheetDescription>
              </SheetHeader>
              <PromoForm form={createForm} onSubmit={onSubmitCreate} submitLabel="Créer la promotion" />
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {promotions.map((p) => (
          <Card key={p.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Tag className="size-4 shrink-0 text-primary" aria-hidden />
                  <h2 className="truncate text-[16px] font-semibold">{p.name}</h2>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {p.starts_at ? formatDate(p.starts_at) : "—"} → {p.ends_at ? formatDate(p.ends_at) : "—"}
                </p>
                <Badge className="mt-1 border-transparent bg-muted text-[11px] text-muted-foreground">
                  {p.scope === "product" ? "Par produit" : "Par famille"}
                </Badge>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) => void toggleActive(p, v)}
                  aria-label={`Activer ${p.name}`}
                />
                {!p.active && (
                  <Badge className="border-transparent bg-muted text-[10px] text-muted-foreground">Inactive</Badge>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Badge className="tabular border-transparent bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
                -{p.value}{p.type_label}
              </Badge>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Générer des coupons"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => { setCouponPromo(p); couponForm.reset({ code: "", max_uses: undefined }); }}
                >
                  <Ticket className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Modifier la promotion"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(p)}
                >
                  <PenLine className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {promotions.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">
            Aucune promotion. Créez votre première campagne.
          </p>
        )}
      </div>

      {/* Dialog édition */}
      <Dialog open={editPromo !== null} onOpenChange={(v) => { if (!v) setEditPromo(null); }}>
        <DialogContent className="rounded-[16px] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Modifier — {editPromo?.name}</DialogTitle>
            <DialogDescription>Mettez à jour les paramètres de la promotion.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <PromoForm form={editForm} onSubmit={onSubmitEdit} submitLabel="Enregistrer" showScope={false} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog coupon */}
      <Dialog open={couponPromo !== null} onOpenChange={(v) => { if (!v) { setCouponPromo(null); couponForm.reset(); } }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="size-5 text-primary" aria-hidden />
              Créer un coupon
            </DialogTitle>
            <DialogDescription>
              Coupon pour la promotion <strong>{couponPromo?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Form {...couponForm}>
            <form onSubmit={couponForm.handleSubmit(onSubmitCoupons)} className="flex flex-col gap-4">
              <FormField control={couponForm.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code du coupon</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PROMO2026"
                      className="mono min-h-[44px] rounded-[10px] uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={couponForm.control} name="max_uses" render={({ field }) => (
                <FormItem>
                  <FormLabel>Utilisations maximum <span className="text-muted-foreground">(vide = illimité)</span></FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="—"
                      className="tabular min-h-[44px] rounded-[10px]"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" className="min-h-[44px] rounded-[10px] px-6" disabled={couponForm.formState.isSubmitting}>
                  {couponForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Créer le coupon
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
