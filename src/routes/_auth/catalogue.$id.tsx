import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { demoProducts, demoSerialUnits } from "@/lib/demo";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/catalogue/$id")({
  head: () => ({
    meta: [
      { title: "Fiche produit — BSS POS" },
      {
        name: "description",
        content: "Détail produit : prix, stock, variantes, lots et fiche technique électronique.",
      },
      { property: "og:title", content: "Fiche produit — BSS POS" },
      { property: "og:description", content: "Modifiez prix, stock et caractéristiques techniques." },
    ],
  }),
  component: ProductDetailPage,
});

const schema = z.object({
  name: z.string().min(2, "Nom requis"),
  sku: z.string().min(2, "SKU requis"),
  price: z.coerce.number().int("Montant entier requis").min(0),
  cost_price: z.coerce.number().int("Montant entier requis").min(0),
  min_stock: z.coerce.number().int().min(0),
});

function ProductDetailPage() {
  const { id } = Route.useParams();
  const product = demoProducts.find((p) => String(p.id) === id) ?? demoProducts[0];
  const units = demoSerialUnits.filter((u) => u.product_id === product.id);

  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost_price: product.cost_price,
      min_stock: product.min_stock,
    },
  });

  const onSubmit = async () => {
    toast.success("Produit mis à jour");
  };

  return (
    <PageBody>
      <PageHeader
        title={product.name}
        description={`${product.family} · marge ${formatXAF(product.price - product.cost_price)}`}
        action={
          <Badge
            className={
              product.stock === 0
                ? "border-transparent bg-destructive/15 px-3 py-1 text-[12px] font-semibold text-destructive"
                : product.stock <= product.min_stock
                  ? "border-transparent bg-warning/20 px-3 py-1 text-[12px] font-semibold text-foreground"
                  : "border-transparent bg-success/15 px-3 py-1 text-[12px] font-semibold text-foreground"
            }
          >
            {product.stock} en stock
          </Badge>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
          <h2 className="text-[17px] font-semibold">Images</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="grid aspect-square place-items-center rounded-[12px] bg-muted text-muted-foreground">
              <ImagePlus className="size-6" aria-hidden />
            </div>
            <button
              type="button"
              className="grid aspect-square cursor-pointer place-items-center rounded-[12px] border border-dashed border-input text-[12px] text-muted-foreground transition-colors duration-150 hover:bg-accent"
            >
              Déposer une image
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
                Lots
              </TabsTrigger>
              <TabsTrigger value="fiche" className="min-h-[36px]">
                Fiche électronique
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
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
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} className="mono min-h-[44px] rounded-[10px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seuil d'alerte</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix d'achat XAF</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de vente XAF</FormLabel>
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

            <TabsContent value="variantes" className="pt-4">
              <p className="text-[15px] text-muted-foreground">
                Aucune variante enregistrée pour ce produit.
              </p>
            </TabsContent>

            <TabsContent value="lots" className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IMEI / série</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Entrée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="mono text-[12px]">{unit.imei}</TableCell>
                        <TableCell className="capitalize">{unit.status}</TableCell>
                        <TableCell className="tabular text-right">
                          {formatDate(unit.entered_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {units.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground">
                          Produit non sérialisé.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="fiche" className="pt-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Processeur", "A17 Pro / Snapdragon 8 Gen 3"],
                  ["Mémoire vive", "8 Go"],
                  ["Stockage", "256 Go"],
                  ["Écran", "6,1\" OLED 120 Hz"],
                  ["Batterie", "3 900 mAh"],
                  ["Connectivité", "5G · Wi-Fi 6E · NFC"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[12px] border border-border p-3">
                    <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {label}
                    </dt>
                    <dd className="mt-1 text-[15px]">{value}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </PageBody>
  );
}
