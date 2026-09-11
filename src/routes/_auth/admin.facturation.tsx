import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_auth/admin/facturation")({
  head: () => ({
    meta: [
      { title: "Paramètres de facturation — BSS POS" },
      {
        name: "description",
        content:
          "Numérotation, TVA, coordonnées légales et mentions affichées sur vos factures B2B.",
      },
      { property: "og:title", content: "Paramètres de facturation — BSS POS" },
      {
        property: "og:description",
        content: "Configurez l'entête, la TVA et la numérotation de vos factures.",
      },
    ],
  }),
  component: BillingSettingsPage,
});

const schema = z.object({
  legalName: z.string().min(2, "Raison sociale requise"),
  rccm: z.string().min(4, "RCCM requis"),
  niu: z.string().min(4, "NIU requis"),
  address: z.string().min(2, "Adresse requise"),
  prefix: z.string().min(1, "Préfixe requis"),
  nextNumber: z.coerce.number().int().min(1),
  vatRate: z.coerce.number().int().min(0).max(100),
  threshold: z.coerce.number().int().min(0),
  vatIncluded: z.boolean(),
  paymentTerms: z.string(),
  legalNotice: z.string(),
});

type BillingFormValues = z.infer<typeof schema>;

function BillingSettingsPage() {
  const form = useForm<BillingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      legalName: "BSS Électronique SARL",
      rccm: "RC/DLA/2019/B/1234",
      niu: "M021912345678A",
      address: "Akwa, Douala",
      prefix: "FAC-2026-",
      nextNumber: 148,
      vatRate: 19,
      threshold: 500000,
      vatIncluded: true,
      paymentTerms: "Paiement à 30 jours fin de mois",
      legalNotice:
        "Tout retard de paiement entraîne des pénalités au taux légal. Garantie constructeur 12 mois sur les appareils neufs.",
    },
  });

  const prefix = form.watch("prefix");
  const nextNumber = form.watch("nextNumber");
  const vatRate = form.watch("vatRate");
  const threshold = form.watch("threshold");
  const vatIncluded = form.watch("vatIncluded");

  const onSubmit = (_values: BillingFormValues) => {
    toast.success("Paramètres de facturation enregistrés");
  };

  return (
    <PageBody>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <PageHeader
            title="Paramètres de facturation"
            description="Entête légal, TVA et numérotation appliqués à toutes les factures."
            action={
              <Button
                type="submit"
                className="min-h-[44px] rounded-[10px] px-6"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                Enregistrer
              </Button>
            }
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
              <p className="text-[17px] font-semibold tracking-tight">Identité légale</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison sociale</FormLabel>
                      <FormControl>
                        <Input className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rccm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RCCM</FormLabel>
                      <FormControl>
                        <Input className="mono min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="niu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro contribuable (NIU)</FormLabel>
                      <FormControl>
                        <Input className="mono min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
              <p className="text-[17px] font-semibold tracking-tight">Numérotation</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Préfixe</FormLabel>
                      <FormControl>
                        <Input className="mono min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prochain numéro</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="tabular min-h-[44px] rounded-[10px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-[13px] text-muted-foreground">
                Prochaine facture :{" "}
                <span className="mono font-medium text-foreground">
                  {prefix}
                  {String(nextNumber || 1).padStart(4, "0")}
                </span>
              </p>
            </Card>

            <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
              <p className="text-[17px] font-semibold tracking-tight">Taxes</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vatRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taux de TVA (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
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
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seuil facture obligatoire (XAF)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1000"
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
                name="vatIncluded"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <FormLabel className="text-[15px] font-medium">Prix affichés TTC</FormLabel>
                      <FormDescription>
                        Désactivez pour saisir et afficher les montants hors taxes.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <p className="text-[13px] text-muted-foreground">
                Facture obligatoire au-delà de{" "}
                <span className="tabular font-medium text-foreground">
                  {formatXAF(threshold || 0)}
                </span>{" "}
                · TVA {vatRate}% {vatIncluded ? "incluse" : "en sus"}.
              </p>
            </Card>

            <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
              <p className="text-[17px] font-semibold tracking-tight">Mentions et conditions</p>
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conditions de règlement</FormLabel>
                    <FormControl>
                      <Input className="min-h-[44px] rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalNotice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mentions de bas de facture</FormLabel>
                    <FormControl>
                      <Textarea rows={4} className="rounded-[10px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>
          </div>
        </form>
      </Form>
    </PageBody>
  );
}
