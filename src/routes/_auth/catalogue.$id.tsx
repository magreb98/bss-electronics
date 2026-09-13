import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";
import { adaptProduct } from "@/lib/adapters";
import { useAuth } from "@/hooks/use-auth";
import type { BackendProduct, BackendProductVariant, BackendSerialUnit } from "@/lib/types";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_auth/catalogue/$id")({
  head: () => ({
    meta: [
      { title: "Fiche produit — BSS POS" },
      {
        name: "description",
        content: "Détail produit : prix, variantes, lots et fiche technique électronique.",
      },
      { property: "og:title", content: "Fiche produit — BSS POS" },
      { property: "og:description", content: "Modifiez prix et caractéristiques du produit." },
    ],
  }),
  component: ProductDetailPage,
});

// Seuls les champs acceptés par PUT /commerce/products/{id}
const schema = z.object({
  label:         z.string().min(2, "Nom requis"),
  reference:     z.string().min(2, "SKU requis"),
  selling_price: z.coerce.number().int("Montant entier requis").min(0),
  vat_rate:      z.coerce.number().min(0).max(100),
});

const variantSchema = z.object({
  label: z.string().min(2, "Nom requis"),
  reference: z.string().min(1, "Référence requise"),
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManageCatalog = user?.role === "gerant" || user?.role === "proprietaire";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ["product", id],
    queryFn: () =>
      request<{ data: BackendProduct }>(`/commerce/products/${id}`)
        .then((r) => adaptProduct(r.data)),
    staleTime: 60_000,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["serial-units", id],
    enabled: Boolean(product?.id),
    queryFn: () =>
      request<{ data: BackendSerialUnit[] }>(`/electronics/serial-units`, { params: { product_id: id } })
        .then((r) => r.data)
        .catch(() => [] as BackendSerialUnit[]),
    staleTime: 60_000,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", id],
    enabled: Boolean(product?.id),
    queryFn: () =>
      request<{ data: BackendProductVariant[] }>(`/commerce/products/${id}/variants`)
        .then((r) => r.data)
        .catch(() => [] as BackendProductVariant[]),
    staleTime: 60_000,
  });

  const variantForm = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: { label: "", reference: "" },
  });

  const onCreateVariant = async (values: z.infer<typeof variantSchema>) => {
    try {
      await request(`/commerce/products/${id}/variants`, { method: "POST", body: values });
      toast.success("Variante créée");
      void qc.invalidateQueries({ queryKey: ["product-variants", id] });
      variantForm.reset();
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          variantForm.setError(f as keyof z.infer<typeof variantSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création de la variante");
      }
    }
  };

  const onPickImage = () => fileInputRef.current?.click();

  const onImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      await request(`/commerce/products/${id}/images/upload`, { method: "POST", body });
      toast.success("Image ajoutée");
      void qc.invalidateQueries({ queryKey: ["product", id] });
      void qc.invalidateQueries({ queryKey: ["catalogue"] });
    } catch (err: unknown) {
      const e2 = err as { errors?: Record<string, string[]>; message?: string };
      toast.error(e2?.errors?.["image"]?.[0] ?? e2?.message ?? "Erreur lors de l'envoi de l'image");
    } finally {
      setUploading(false);
    }
  };

  const onDeleteImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      await request(`/commerce/products/${id}/images/${imageId}`, { method: "DELETE" });
      toast.success("Image supprimée");
      void qc.invalidateQueries({ queryKey: ["product", id] });
      void qc.invalidateQueries({ queryKey: ["catalogue"] });
    } catch (err: unknown) {
      const e2 = err as { message?: string };
      toast.error(e2?.message ?? "Erreur lors de la suppression");
    } finally {
      setDeletingImageId(null);
    }
  };

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      label:         product?.name ?? "",
      reference:     product?.sku ?? "",
      selling_price: product?.price ?? 0,
      vat_rate:      product?.vat_rate ?? 19.25,
    },
  });

  useEffect(() => {
    if (!product) return;
    form.reset({
      label:         product.name,
      reference:     product.sku,
      selling_price: product.price,
      vat_rate:      product.vat_rate ?? 19.25,
    });
  }, [product?.id, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request(`/commerce/products/${id}`, {
        method: "PUT",
        body: {
          label:         values.label,
          reference:     values.reference,
          selling_price: values.selling_price,
          vat_rate:      values.vat_rate,
        },
      });
      toast.success("Produit mis à jour");
      void qc.invalidateQueries({ queryKey: ["catalogue"] });
      void qc.invalidateQueries({ queryKey: ["product", id] });
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof schema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la mise à jour");
      }
    }
  };

  if (!product) {
    return (
      <PageBody>
        <PageHeader title="Chargement…" description="Récupération du produit en cours." />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title={product.name}
        description={`${product.family} · ${product.sku}`}
        action={
          <Badge
            className={
              product.active === false
                ? "border-transparent bg-muted px-3 py-1 text-[12px] font-semibold text-muted-foreground"
                : "border-transparent bg-success/15 px-3 py-1 text-[12px] font-semibold text-foreground"
            }
          >
            {product.active === false ? "Inactif" : "Actif"}
          </Badge>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <h2 className="text-[17px] font-semibold">Images</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(product.images ?? []).map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-[12px]">
                <img src={img.url} alt={product.name} className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Supprimer l'image"
                  disabled={deletingImageId === img.id}
                  onClick={() => void onDeleteImage(img.id)}
                  className="absolute right-1.5 top-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 disabled:opacity-100"
                >
                  {deletingImageId === img.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <X className="size-3.5" aria-hidden />
                  )}
                </button>
              </div>
            ))}
            {(product.images ?? []).length === 0 && (
              <div className="grid aspect-square place-items-center rounded-[12px] bg-muted text-muted-foreground">
                <ImagePlus className="size-6" aria-hidden />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => void onImageSelected(e)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={onPickImage}
              className="grid aspect-square cursor-pointer place-items-center gap-1 rounded-[12px] border border-dashed border-input text-[12px] text-muted-foreground transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  Déposer une image
                </>
              )}
            </button>
          </div>
        </Card>

        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <Tabs defaultValue="general">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="general" className="min-h-[36px]">
                Général
              </TabsTrigger>
              <TabsTrigger value="variantes" className="min-h-[36px]">
                Variantes
              </TabsTrigger>
              <TabsTrigger value="lots" className="min-h-[36px]">
                Lots / Séries
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nom du produit</FormLabel>
                        <FormControl>
                          <Input {...field} className="min-h-[44px] rounded-[10px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU / Référence</FormLabel>
                        <FormControl>
                          <Input {...field} className="mono min-h-[44px] rounded-[10px]" />
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
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="tabular min-h-[44px] rounded-[10px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="selling_price"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Prix de vente (XAF)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="1"
                            min="0"
                            className="tabular min-h-[44px] rounded-[10px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="min-h-[44px] rounded-[10px] px-5 font-medium"
                    >
                      {form.formState.isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="variantes" className="flex flex-col gap-4 pt-4">
              {canManageCatalog && (
                <Form {...variantForm}>
                  <form
                    onSubmit={variantForm.handleSubmit(onCreateVariant)}
                    className="flex flex-wrap items-start gap-2"
                  >
                    <FormField
                      control={variantForm.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem className="min-w-[160px] flex-1">
                          <FormControl>
                            <Input placeholder="Nom de la variante" className="min-h-[40px] rounded-[10px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={variantForm.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem className="min-w-[140px] flex-1">
                          <FormControl>
                            <Input placeholder="Référence" className="mono min-h-[40px] rounded-[10px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="min-h-[40px] shrink-0 rounded-[10px] px-4"
                      disabled={variantForm.formState.isSubmitting}
                    >
                      {variantForm.formState.isSubmitting ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Plus className="size-4" aria-hidden />
                      )}
                      Ajouter
                    </Button>
                  </form>
                </Form>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.label}</TableCell>
                      <TableCell className="mono text-[12px] text-muted-foreground">{v.reference}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={
                            v.active
                              ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                              : "border-transparent bg-muted text-[11px] font-semibold text-muted-foreground"
                          }
                        >
                          {v.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {variants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                        Aucune variante enregistrée pour ce produit.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="lots" className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IMEI / Série</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Entrée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="mono text-[12px]">{unit.serial_number}</TableCell>
                        <TableCell className="capitalize">{unit.status}</TableCell>
                        <TableCell className="tabular text-right">
                          {formatDate(unit.entered_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {units.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          Produit non sérialisé ou aucune unité enregistrée.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </PageBody>
  );
}
