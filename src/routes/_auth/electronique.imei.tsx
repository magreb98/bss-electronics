import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { request } from "@/lib/api";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/format";
import type { BackendProduct, BackendSerialUnit } from "@/lib/types";

export const Route = createFileRoute("/_auth/electronique/imei")({
  head: () => ({
    meta: [
      { title: "Suivi IMEI & numéros de série — BSS POS" },
      {
        name: "description",
        content: "Recherchez un IMEI, vérifiez son statut et retracez son parcours en boutique.",
      },
      { property: "og:title", content: "Suivi IMEI — BSS POS" },
      { property: "og:description", content: "Chaque appareil tracé de la réception à la vente." },
    ],
  }),
  component: ImeiPage,
});

const STATUS_STYLE: Record<string, string> = {
  disponible: "bg-success/15 text-foreground",
  vendu:      "bg-muted text-foreground",
  reserve:    "bg-warning/20 text-foreground",
  hs:         "bg-destructive/15 text-destructive",
};

const STATUS_LABEL: Record<string, string> = {
  disponible: "Disponible",
  vendu:      "Vendu",
  reserve:    "Réservé",
  hs:         "Hors service",
};

const addSchema = z.object({
  product_id:    z.string().min(1, "Produit requis"),
  serial_number: z.string().min(4, "Numéro de série requis"),
  status:        z.enum(["disponible", "hs", "reserve"]),
});

function ImeiPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["serial-units", debounced],
    queryFn: () =>
      request<{ data: BackendSerialUnit[] }>(
        `/electronics/serial-units${debounced ? `?search=${encodeURIComponent(debounced)}` : ""}`,
      )
        .then((r) => r.data)
        .catch(() => [] as BackendSerialUnit[]),
    staleTime: 30_000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-serialized"],
    queryFn: () =>
      request<{ data: BackendProduct[] }>("/commerce/products")
        .then((r) => r.data.filter((p) => p.granularity === "serial"))
        .catch(() => [] as BackendProduct[]),
    staleTime: 60_000,
  });

  const form = useForm<z.infer<typeof addSchema>>({
    resolver: zodResolver(addSchema),
    defaultValues: { product_id: "", serial_number: "", status: "disponible" },
  });

  const onSubmit = async (values: z.infer<typeof addSchema>) => {
    try {
      await request("/electronics/serial-units", {
        method: "POST",
        body: values,
      });
      toast.success("Unité série ajoutée");
      void qc.invalidateQueries({ queryKey: ["serial-units"] });
      form.reset();
      setAddOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof addSchema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de l'ajout");
      }
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="IMEI & séries"
        description="Parc d'appareils identifiés individuellement."
        action={
          <Button
            className="min-h-[44px] rounded-[10px] px-5 font-medium"
            onClick={() => { form.reset(); setAddOpen(true); }}
          >
            <Plus className="size-4" aria-hidden />
            Ajouter
          </Button>
        }
      />

      <div className="relative max-w-[420px]">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un IMEI ou un modèle"
          aria-label="Rechercher un IMEI"
          className="mono min-h-[44px] rounded-[10px] pl-9"
        />
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>IMEI / série</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Entré le</TableHead>
              <TableHead className="text-right">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : (
              units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="mono text-[12px]">{u.serial_number}</TableCell>
                  <TableCell className="font-medium">{u.product?.label ?? "—"}</TableCell>
                  <TableCell className="tabular">{formatDate(u.entered_at)}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={`border-transparent text-[11px] font-semibold ${STATUS_STYLE[u.status] ?? "bg-muted"}`}
                    >
                      {STATUS_LABEL[u.status] ?? u.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!isLoading && units.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Aucun appareil ne correspond à cette recherche.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) form.reset(); }}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle>Ajouter une unité série</DialogTitle>
            <DialogDescription>Enregistrez un nouvel IMEI ou numéro de série en stock.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produit</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] rounded-[10px]">
                          <SelectValue placeholder="Choisir un produit sérialisé…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serial_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMEI / numéro de série</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="356938035643809"
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut initial</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="min-h-[44px] rounded-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="reserve">Réservé</SelectItem>
                        <SelectItem value="hs">Hors service</SelectItem>
                      </SelectContent>
                    </Select>
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
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}
