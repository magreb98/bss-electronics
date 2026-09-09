import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function BillingSettingsPage() {
  const [prefix, setPrefix] = useState("FAC-2026-");
  const [nextNumber, setNextNumber] = useState(148);
  const [vat, setVat] = useState(19);
  const [threshold, setThreshold] = useState(500000);
  const [vatIncluded, setVatIncluded] = useState(true);

  return (
    <PageBody>
      <PageHeader
        title="Paramètres de facturation"
        description="Entête légal, TVA et numérotation appliqués à toutes les factures."
        action={
          <Button
            className="min-h-[44px] rounded-[10px] px-6"
            onClick={() => toast.success("Paramètres de facturation enregistrés")}
          >
            Enregistrer
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[17px] font-semibold tracking-tight">Identité légale</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="legal-name">Raison sociale</Label>
              <Input
                id="legal-name"
                defaultValue="BSS Électronique SARL"
                className="min-h-[44px] rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rccm">RCCM</Label>
              <Input
                id="rccm"
                defaultValue="RC/DLA/2019/B/1234"
                className="mono min-h-[44px] rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="niu">Numéro contribuable (NIU)</Label>
              <Input
                id="niu"
                defaultValue="M021912345678A"
                className="mono min-h-[44px] rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing-address">Adresse</Label>
              <Input
                id="billing-address"
                defaultValue="Akwa, Douala"
                className="min-h-[44px] rounded-[10px]"
              />
            </div>
          </div>
        </Card>

        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[17px] font-semibold tracking-tight">Numérotation</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="prefix">Préfixe</Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="mono min-h-[44px] rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next-number">Prochain numéro</Label>
              <Input
                id="next-number"
                type="number"
                min="1"
                step="1"
                value={nextNumber}
                onChange={(e) => setNextNumber(Math.max(1, Math.trunc(e.target.valueAsNumber || 1)))}
                className="tabular min-h-[44px] rounded-[10px]"
              />
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Prochaine facture émise :{" "}
            <span className="mono font-medium text-foreground">
              {prefix}
              {String(nextNumber).padStart(4, "0")}
            </span>
          </p>
        </Card>

        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[17px] font-semibold tracking-tight">Taxes</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="vat-rate">Taux de TVA (%)</Label>
              <Input
                id="vat-rate"
                type="number"
                min="0"
                step="1"
                value={vat}
                onChange={(e) => setVat(Math.max(0, Math.trunc(e.target.valueAsNumber || 0)))}
                className="tabular min-h-[44px] rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="threshold">Seuil facture obligatoire (XAF)</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                step="1000"
                value={threshold}
                onChange={(e) =>
                  setThreshold(Math.max(0, Math.trunc(e.target.valueAsNumber || 0)))
                }
                className="tabular min-h-[44px] rounded-[10px]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-medium">Prix affichés TTC</p>
              <p className="text-[13px] text-muted-foreground">
                Désactivez pour saisir et afficher les montants hors taxes.
              </p>
            </div>
            <Switch
              checked={vatIncluded}
              onCheckedChange={setVatIncluded}
              aria-label="Prix affichés TTC"
            />
          </div>
          <p className="text-[13px] text-muted-foreground">
            Facture obligatoire au-delà de{" "}
            <span className="tabular font-medium text-foreground">{formatXAF(threshold)}</span> ·
            TVA {vat}% {vatIncluded ? "incluse" : "en sus"}.
          </p>
        </Card>

        <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
          <p className="text-[17px] font-semibold tracking-tight">Mentions et conditions</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="payment-terms">Conditions de règlement</Label>
            <Input
              id="payment-terms"
              defaultValue="Paiement à 30 jours fin de mois"
              className="min-h-[44px] rounded-[10px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="legal-notice">Mentions de bas de facture</Label>
            <Textarea
              id="legal-notice"
              rows={4}
              defaultValue="Tout retard de paiement entraîne des pénalités au taux légal. Garantie constructeur 12 mois sur les appareils neufs."
              className="rounded-[10px]"
            />
          </div>
        </Card>
      </div>
    </PageBody>
  );
}
