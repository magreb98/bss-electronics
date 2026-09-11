import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatDate } from "@/lib/format";
import type { BackendSerialUnit } from "@/lib/types";

export const Route = createFileRoute("/_auth/electronique/garanties")({
  head: () => ({
    meta: [
      { title: "Garanties — BSS POS" },
      {
        name: "description",
        content: "Vérifiez la validité des garanties constructeur et boutique par IMEI.",
      },
      { property: "og:title", content: "Garanties — BSS POS" },
      { property: "og:description", content: "Une réponse immédiate au comptoir." },
    ],
  }),
  component: WarrantiesPage,
});

interface BackendWarranty {
  id: string;
  serial_unit?: { id: string; serial_number: string } | null;
  product?: { id: string; label: string } | null;
  customer?: { id: string; name: string } | null;
  starts_at: string;
  ends_at: string;
  status: "active" | "expired" | "expiree";
}

const warrantySchema = z.object({
  serial_unit_id: z.string().min(1, "Unité série requise"),
  starts_at:      z.string().min(1, "Date de début requise"),
  ends_at:        z.string().min(1, "Date de fin requise"),
});

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function isExpiringSoon(endsAt: string) {
  return new Date(endsAt).getTime() - Date.now() < THIRTY_DAYS;
}

function WarrantiesPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: warranties = [], isLoading } = useQuery({
    queryKey: ["warranties"],
    queryFn: () =>
      request<{ data: BackendWarranty[] }>("/electronics/warranties")
        .then((r) => r.data)
        .catch(() => [] as BackendWarranty[]),
    staleTime: 30_000,
  });

  const { data: serialUnits = [] } = useQuery({
    queryKey: ["serial-units-all"],
    queryFn: () =>
      request<{ data: BackendSerialUnit[] }>("/electronics/serial-units?status=vendu")
        .then((r) => r.data)
        .catch(() => [] as BackendSerialUnit[]),
    staleTime: 60_000,
  });

  const form = useForm<z.infer<typeof warrantySchema>>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      serial_unit_id: "",
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values: z.infer<typeof warrantySchema>) => {
    try {
      await request("/electronics/warranties", {
        method: "POST",
        body: values,
      });
      toast.success("Garantie enregistrée");
      void qc.invalidateQueries({ queryKey: ["warranties"] });
      form.reset();
      setAddOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof warrantySchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de l'enregistrement");
      }
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Garanties"
        description="Couverture des appareils vendus."
        action={
          <Button
            className="min-h-[44px] rounded-[10px] px-5 font-medium"
            onClick={() => { form.reset(); setAddOpen(true); }}
          >
            <Plus className="size-4" aria-hidden />
            Nouvelle garantie
          </Button>
        }
      />

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>IMEI</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : (
              warranties.map((w) => {
                const active = w.status === "active";
                const expiringSoon = active && isExpiringSoon(w.ends_at);
                return (
                  <TableRow key={w.id}>
                    <TableCell className="mono text-[12px]">
                      {w.serial_unit?.serial_number ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">{w.product?.label ?? "—"}</TableCell>
                    <TableCell>{w.customer?.name ?? "—"}</TableCell>
                    <TableCell className="tabular">{formatDate(w.starts_at)}</TableCell>
                    <TableCell className={`tabular ${expiringSoon ? "text-warning font-medium" : ""}`}>
                      {formatDate(w.ends_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          active && !expiringSoon
                            ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                            : expiringSoon
                              ? "border-transparent bg-warning/20 text-[11px] font-semibold text-foreground"
                              : "border-transparent bg-destructive/15 text-[11px] font-semibold text-destructive"
                        }
                      >
                        {active && !expiringSoon ? "Active" : expiringSoon ? "Expire bientôt" : "Expirée"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!isLoading && warranties.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Aucune garantie enregistrée.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) form.reset(); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Nouvelle garantie</DialogTitle>
            <DialogDescription>Enregistrez la garantie d'un appareil vendu.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="serial_unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité série (IMEI)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] rounded-[10px]">
                          <SelectValue placeholder="Sélectionner un IMEI…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serialUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <span className="mono">{u.serial_number}</span>
                            {u.product && (
                              <span className="ml-2 text-muted-foreground">— {u.product.label}</span>
                            )}
                          </SelectItem>
                        ))}
                        {serialUnits.length === 0 && (
                          <SelectItem value="" disabled>Aucune unité disponible</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="starts_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début</FormLabel>
                      <FormControl>
                        <Input type="date" className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ends_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin</FormLabel>
                      <FormControl>
                        <Input type="date" className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
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
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
