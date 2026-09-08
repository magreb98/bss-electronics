import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

const team = [
  { id: 1, name: "Alice Ndongo", role: "Gérant", active: true },
  { id: 2, name: "Boris Kamga", role: "Vendeur", active: true },
  { id: 3, name: "Sandrine Eyenga", role: "Caissier", active: false },
];

function SettingsPage() {
  return (
    <PageBody>
      <PageHeader title="Paramètres" description="Configuration de la boutique et de l'équipe." />

      <Tabs defaultValue="boutique">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="boutique" className="min-h-[36px]">
            Boutique
          </TabsTrigger>
          <TabsTrigger value="ticket" className="min-h-[36px]">
            Ticket
          </TabsTrigger>
          <TabsTrigger value="equipe" className="min-h-[36px]">
            Équipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boutique" className="pt-4">
          <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="shop-name">Nom de la boutique</Label>
                <Input
                  id="shop-name"
                  defaultValue="BSS Électronique — Centre"
                  className="min-h-[44px] rounded-[10px]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shop-phone">Téléphone</Label>
                <Input
                  id="shop-phone"
                  defaultValue="+237 233 42 00 00"
                  className="mono min-h-[44px] rounded-[10px]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shop-tva">Taux de TVA (%)</Label>
                <Input
                  id="shop-tva"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={19}
                  className="tabular min-h-[44px] rounded-[10px]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shop-city">Ville</Label>
                <Input id="shop-city" defaultValue="Douala" className="min-h-[44px] rounded-[10px]" />
              </div>
            </div>
            <Button
              className="min-h-[44px] w-fit rounded-[10px] px-6"
              onClick={() => toast.success("Paramètres enregistrés")}
            >
              Enregistrer
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="ticket" className="pt-4">
          <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] font-medium">Imprimer automatiquement le ticket</p>
                <p className="text-[13px] text-muted-foreground">
                  Lance l'impression dès la validation du paiement.
                </p>
              </div>
              <Switch defaultChecked aria-label="Impression automatique" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ticket-footer">Message de bas de ticket</Label>
              <Input
                id="ticket-footer"
                defaultValue="Merci de votre confiance — garantie 12 mois"
                className="min-h-[44px] rounded-[10px]"
              />
            </div>
            <Button
              className="min-h-[44px] w-fit rounded-[10px] px-6"
              onClick={() => toast.success("Ticket mis à jour")}
            >
              Enregistrer
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="equipe" className="pt-4">
          <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.role}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          m.active
                            ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                            : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                        }
                      >
                        {m.active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}
