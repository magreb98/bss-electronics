import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { request } from "@/lib/api";
import { adaptCustomers } from "@/lib/adapters";
import { formatXAF } from "@/lib/format";
import type { BackendCustomer, Customer } from "@/lib/types";

export const Route = createFileRoute("/_auth/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — BSS POS" },
      {
        name: "description",
        content: "Fichier client : coordonnées, avoirs disponibles et historique d'achats.",
      },
      { property: "og:title", content: "Clients — BSS POS" },
      { property: "og:description", content: "Fidélisez vos clients avec un fichier centralisé." },
    ],
  }),
  component: CustomersPage,
});

const schema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères min.)"),
  phone: z.string().min(8, "Numéro invalide"),
  credit_limit: z.coerce.number().int().min(0),
});

function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ["customers", debounced],
    queryFn: () =>
      request<{ data: BackendCustomer[] }>("/commerce/customers", { params: { search: debounced } })
        .then((r) => adaptCustomers(r.data))
        .catch(() => [] as Customer[]),
    staleTime: 30_000,
  });

  const rows = (data ?? []).filter(
    (c) =>
      !debounced ||
      c.name.toLowerCase().includes(debounced.toLowerCase()) ||
      c.phone.includes(debounced),
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", credit_limit: 0 },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/commerce/customers", {
        method: "POST",
        body: { name: values.name, phone: values.phone, credit_limit: values.credit_limit },
      });
      toast.success("Client créé avec succès");
      void qc.invalidateQueries({ queryKey: ["customers"] });
      form.reset();
      setOpen(false);
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([field, msgs]) =>
          form.setError(field as keyof z.infer<typeof schema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de la création");
      }
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Clients"
        description="Base clients de la boutique."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[16px]">
              <DialogHeader>
                <DialogTitle>Nouveau client</DialogTitle>
                <DialogDescription>
                  Enregistrez un client pour suivre ses achats et son avoir.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Ngono Marie" className="min-h-[44px] rounded-[10px]" {...field} />
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
                          <Input
                            inputMode="tel"
                            placeholder="+237 6XX XXX XXX"
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
                    name="credit_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plafond avoir (XAF)</FormLabel>
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
                  <DialogFooter>
                    <Button
                      type="submit"
                      className="min-h-[44px] rounded-[10px] px-6"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting && (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      )}
                      Créer le client
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
          placeholder="Rechercher un client…"
          aria-label="Rechercher un client"
          className="min-h-[44px] rounded-[10px] pl-10"
        />
      </div>

      <Card className="gap-0 overflow-x-auto rounded-[16px] border-border p-0 shadow-none">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead className="text-right">Achats</TableHead>
              <TableHead className="text-right">Total dépensé</TableHead>
              <TableHead className="text-right">Avoir</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="mono text-[12px] text-muted-foreground">{c.phone}</TableCell>
                <TableCell className="tabular text-right">{c.sales_count}</TableCell>
                <TableCell className="tabular text-right">{formatXAF(c.total_spent)}</TableCell>
                <TableCell className="text-right">
                  {c.credit > 0 ? (
                    <Badge className="tabular border-transparent bg-success/15 text-[11px] font-semibold text-foreground">
                      {formatXAF(c.credit)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" className="min-h-[44px] rounded-[10px]">
                    <Link to="/clients/$id" params={{ id: String(c.id) }}>
                      Ouvrir
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Aucun client trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </PageBody>
  );
}
