import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api";
import { adaptProducts } from "@/lib/adapters";
import { formatXAF } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import type { BackendProduct, Family, Product } from "@/lib/types";

export const Route = createFileRoute("/_auth/catalogue/")({
  head: () => ({
    meta: [
      { title: "Catalogue produits — BSS POS" },
      {
        name: "description",
        content: "Gérez smartphones, tablettes et accessoires : prix, SKU, familles et stocks.",
      },
      { property: "og:title", content: "Catalogue produits — BSS POS" },
      { property: "og:description", content: "Tout votre catalogue électronique en un écran." },
    ],
  }),
  component: CataloguePage,
});

const schema = z.object({
  label: z.string().min(2, "Nom requis"),
  reference: z.string().min(2, "SKU requis"),
  family_id: z.string().min(1, "Famille requise"),
  selling_price: z.coerce.number().int("Entier XAF requis").min(1, "Prix requis"),
  vat_rate: z.coerce.number().min(0).max(100),
  granularity: z.enum(["quantity", "serial", "variant", "batch", "service"]),
});

function CataloguePage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  // Gérer les familles
  const [familiesOpen, setFamiliesOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { user } = useAuth();
  const canManageFamilies = user?.role === "gerant" || user?.role === "proprietaire";

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const { data } = useQuery({
    queryKey: ["catalogue", debounced],
    queryFn: () =>
      request<{ data: BackendProduct[] }>("/commerce/products", { params: { search: debounced } })
        .then((r) => adaptProducts(r.data))
        .catch(() => [] as Product[]),
    staleTime: 30_000,
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: () =>
      request<{ data: Family[] }>("/commerce/families")
        .then((r) => r.data)
        .catch(() => [] as Family[]),
    staleTime: 60_000,
  });

  const rows = (data ?? []).filter(
    (p) =>
      !debounced ||
      p.name.toLowerCase().includes(debounced.toLowerCase()) ||
      p.sku.toLowerCase().includes(debounced.toLowerCase()),
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      reference: "",
      family_id: "",
      selling_price: 0,
      vat_rate: 19.25,
      granularity: "quantity",
    },
  });

  // ── Créer famille ───────────────────────────────────────────────────────────
  const createFamily = async () => {
    if (!newFamilyName.trim()) return;
    setCreatingFamily(true);
    try {
      const res = await request<{ data: Family }>("/commerce/families", {
        method: "POST",
        body: { name: newFamilyName.trim() },
      });
      toast.success("Famille créée");
      void qc.invalidateQueries({ queryKey: ["families"] });
      form.setValue("family_id", res.data.id);
      setNewFamilyName("");
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Erreur lors de la création");
    } finally {
      setCreatingFamily(false);
    }
  };

  // ── Renommer famille ────────────────────────────────────────────────────────
  const startEdit = (f: Family) => {
    setConfirmDeleteId(null);
    setEditingId(f.id);
    setEditingName(f.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    setSavingEdit(true);
    try {
      await request(`/commerce/families/${editingId}`, {
        method: "PUT",
        body: { name: editingName.trim() },
      });
      toast.success("Famille renommée");
      void qc.invalidateQueries({ queryKey: ["families"] });
      setEditingId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Erreur lors de la modification");
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditingName(""); };

  // ── Supprimer famille ───────────────────────────────────────────────────────
  const deleteFamily = async (id: string) => {
    setDeletingId(id);
    try {
      await request(`/commerce/families/${id}`, { method: "DELETE" });
      toast.success("Famille supprimée");
      void qc.invalidateQueries({ queryKey: ["families"] });
      if (form.getValues("family_id") === id) form.setValue("family_id", "");
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e?.message ?? "Impossible de supprimer — des produits utilisent peut-être cette famille");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Créer produit ───────────────────────────────────────────────────────────
  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/commerce/products", { method: "POST", body: values });
      toast.success("Produit créé avec succès");
      void qc.invalidateQueries({ queryKey: ["catalogue"] });
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof schema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Catalogue"
        description="Produits, variantes et lots de la boutique."
        action={
          <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <SheetTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouveau produit
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[480px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Nouveau produit</SheetTitle>
                <SheetDescription>Ajoutez un produit au catalogue de la boutique.</SheetDescription>
              </SheetHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-1 flex-col gap-4 overflow-y-auto px-1"
                >
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du produit</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="iPhone 15 Pro 256 Go"
                            className="min-h-[44px] rounded-[10px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU / Référence</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="APL-15P-256"
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
                      name="family_id"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Famille</FormLabel>
                            {canManageFamilies && (
                              <button
                                type="button"
                                className="text-[11px] font-medium text-primary hover:underline"
                                onClick={() => setFamiliesOpen(true)}
                              >
                                Gérer
                              </button>
                            )}
                          </div>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="min-h-[44px] rounded-[10px]">
                                <SelectValue placeholder="Choisir…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {families.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                              {families.length === 0 && (
                                <SelectItem value="" disabled>
                                  Aucune famille — cliquez Gérer
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="selling_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix de vente (XAF)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              className="tabular min-h-[44px] rounded-[10px]"
                              {...field}
                            />
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
                          <FormLabel>TVA (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              className="tabular min-h-[44px] rounded-[10px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="granularity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de gestion</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="min-h-[44px] rounded-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quantity">Par quantité</SelectItem>
                            <SelectItem value="serial">Par numéro de série (IMEI)</SelectItem>
                            <SelectItem value="variant">Par variante</SelectItem>
                            <SelectItem value="batch">Par lot</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="mt-auto min-h-[44px] w-full rounded-[10px]"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    Créer le produit
                  </Button>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="relative max-w-[420px]">
        <Search
          className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          aria-label="Rechercher un produit"
          className="min-h-[44px] rounded-[10px] pl-10"
        />
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Produit</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Famille</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Prix</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">
                  {product.sku}
                </TableCell>
                <TableCell className="text-muted-foreground">{product.family}</TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border-transparent text-[11px] font-semibold",
                      product.has_serial
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {product.has_serial ? "Sérialisé" : "Quantité"}
                  </Badge>
                </TableCell>
                <TableCell className="tabular text-right">{formatXAF(product.price)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" className="min-h-[44px] rounded-[10px]">
                    <Link to="/catalogue/$id" params={{ id: String(product.id) }}>
                      Ouvrir
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun produit trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Dialog gestion des familles ─────────────────────────────────────── */}
      <Dialog
        open={familiesOpen}
        onOpenChange={(v) => {
          setFamiliesOpen(v);
          if (!v) {
            setNewFamilyName("");
            setEditingId(null);
            setConfirmDeleteId(null);
          }
        }}
      >
        <DialogContent className="rounded-[16px] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Gérer les familles</DialogTitle>
            <DialogDescription>
              Créez, renommez ou supprimez les familles de produits.
            </DialogDescription>
          </DialogHeader>

          {/* Nouvelle famille */}
          <div className="flex gap-2">
            <Input
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder="Nom de la nouvelle famille…"
              className="min-h-[40px] rounded-[10px]"
              onKeyDown={(e) => { if (e.key === "Enter") void createFamily(); }}
            />
            <Button
              className="min-h-[40px] shrink-0 rounded-[10px] px-4"
              disabled={!newFamilyName.trim() || creatingFamily}
              onClick={() => void createFamily()}
            >
              {creatingFamily
                ? <Loader2 className="size-4 animate-spin" aria-hidden />
                : <Plus className="size-4" aria-hidden />
              }
              Ajouter
            </Button>
          </div>

          {families.length > 0 && <Separator />}

          {/* Liste des familles */}
          {families.length > 0 && (
            <ul className="flex max-h-[320px] flex-col divide-y divide-border overflow-y-auto">
              {families.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-2">
                  {editingId === f.id ? (
                    <>
                      <Input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="min-h-[36px] flex-1 rounded-[8px] text-[13px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 shrink-0 rounded-[8px] text-success hover:bg-success/10 hover:text-success"
                        disabled={!editingName.trim() || savingEdit}
                        onClick={() => void saveEdit()}
                        aria-label="Enregistrer"
                      >
                        {savingEdit
                          ? <Loader2 className="size-4 animate-spin" />
                          : <Check className="size-4" />
                        }
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 shrink-0 rounded-[8px]"
                        onClick={cancelEdit}
                        aria-label="Annuler"
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : confirmDeleteId === f.id ? (
                    <>
                      <p className="flex-1 truncate text-[13px] text-destructive">
                        Supprimer <strong>{f.name}</strong> ?
                      </p>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="min-h-[36px] rounded-[8px] px-3 text-[12px]"
                        disabled={deletingId === f.id}
                        onClick={() => void deleteFamily(f.id)}
                      >
                        {deletingId === f.id
                          ? <Loader2 className="size-3.5 animate-spin" />
                          : "Confirmer"
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[36px] rounded-[8px] px-3 text-[12px]"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-[14px]">{f.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 shrink-0 rounded-[8px]"
                        onClick={() => startEdit(f)}
                        aria-label={`Renommer ${f.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 shrink-0 rounded-[8px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => { setEditingId(null); setConfirmDeleteId(f.id); }}
                        aria-label={`Supprimer ${f.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {families.length === 0 && (
            <p className="py-2 text-center text-[13px] text-muted-foreground">
              Aucune famille pour l'instant.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
