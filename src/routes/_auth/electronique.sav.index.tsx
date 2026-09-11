import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, Loader2, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { request } from "@/lib/api";
import { formatDate, formatXAF } from "@/lib/format";
import type { ServiceTicket } from "@/lib/types";

export const Route = createFileRoute("/_auth/electronique/sav/")({
  head: () => ({
    meta: [
      { title: "Service après-vente — BSS POS" },
      {
        name: "description",
        content: "Suivez les réparations, diagnostics et restitutions d'appareils clients.",
      },
      { property: "og:title", content: "Service après-vente — BSS POS" },
      { property: "og:description", content: "Chaque réparation suivie étape par étape." },
    ],
  }),
  component: ServicePage,
});

const steps = ["open", "in_repair", "closed"] as const;
const stepLabels: Record<string, string> = {
  open: "Ouvert",
  in_repair: "En réparation",
  closed: "Clôturé",
};
const nextStep: Record<string, string> = {
  open: "in_repair",
  in_repair: "closed",
};

const schema = z.object({
  serial_unit_id: z.string().min(1, "Unité sérialisée requise"),
  description: z.string().min(5, "Description requise (5 car. min.)"),
});

function ServicePage() {
  const [open, setOpen] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: tickets = [] } = useQuery({
    queryKey: ["service-tickets"],
    queryFn: () =>
      request<{ data: ServiceTicket[] }>("/electronics/service-tickets")
        .then((r) => r.data)
        .catch(() => [] as ServiceTicket[]),
    staleTime: 30_000,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { serial_unit_id: "", description: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request("/electronics/service-tickets", { method: "POST", body: values });
      toast.success("Ticket SAV créé");
      void qc.invalidateQueries({ queryKey: ["service-tickets"] });
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

  const advance = async (ticket: ServiceTicket) => {
    const next = nextStep[ticket.status];
    if (!next) return;
    setAdvancing(String(ticket.id));
    try {
      await request(`/electronics/service-tickets/${ticket.id}`, {
        method: "PATCH",
        body: { status: next },
      });
      toast.success(`Ticket passé à : ${stepLabels[next]}`);
      void qc.invalidateQueries({ queryKey: ["service-tickets"] });
    } catch {
      toast.error("Impossible de faire avancer le ticket");
    } finally {
      setAdvancing(null);
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="SAV"
        description="Tickets de réparation en cours."
        action={
          <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <SheetTrigger asChild>
              <Button className="min-h-[44px] rounded-[10px] px-5 font-medium">
                <Plus className="size-4" aria-hidden />
                Nouveau ticket
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-0 sm:max-w-[480px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Nouveau ticket SAV</SheetTitle>
                <SheetDescription>Ouvrez un ticket de réparation pour un appareil client.</SheetDescription>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto px-1">
                  <FormField
                    control={form.control}
                    name="serial_unit_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID de l'unité sérialisée</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="UUID de l'unité (IMEI/séries)"
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description du problème</FormLabel>
                        <FormControl>
                          <Textarea rows={4} className="rounded-[10px]" placeholder="Écran fissuré, batterie qui se vide…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="mt-auto min-h-[44px] w-full rounded-[10px]" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Ouvrir le ticket
                  </Button>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {tickets.map((t) => {
          const index = steps.indexOf(t.status as (typeof steps)[number]);
          const hasNext = Boolean(nextStep[t.status]);
          return (
            <Card key={t.id} className="gap-0 rounded-[16px] border-border p-5 shadow-none">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="mono text-[12px] text-muted-foreground">{t.reference}</p>
                  <h2 className="truncate text-[16px] font-semibold">{t.product}</h2>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {t.customer} · {formatDate(t.created_at)}
                  </p>
                </div>
                <Badge
                  className={
                    t.under_warranty
                      ? "border-transparent bg-success/15 text-[11px] font-semibold text-foreground"
                      : "border-transparent bg-muted text-[11px] font-semibold text-foreground"
                  }
                >
                  {t.under_warranty ? "Sous garantie" : "Hors garantie"}
                </Badge>
              </div>

              <ol className="mt-4 flex flex-wrap gap-1.5">
                {steps.map((s, i) => (
                  <li
                    key={s}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      i <= index ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {stepLabels[s]}
                  </li>
                ))}
              </ol>

              <div className="mt-4 flex items-center justify-between">
                <span className="mono text-[12px] text-muted-foreground">{t.imei}</span>
                <span className="tabular text-[15px] font-semibold">{formatXAF(t.repair_cost)}</span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" className="min-h-[44px] flex-1 rounded-[10px]">
                  <Link to="/electronique/sav/$id" params={{ id: String(t.id) }}>
                    <ChevronRight className="size-4" aria-hidden />
                    Détail
                  </Link>
                </Button>
                <Button
                  className="min-h-[44px] flex-1 rounded-[10px]"
                  disabled={!hasNext || advancing === String(t.id)}
                  onClick={() => void advance(t)}
                >
                  {advancing === String(t.id) ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Wrench className="size-4" aria-hidden />
                  )}
                  {hasNext ? `→ ${stepLabels[nextStep[t.status] ?? ""]}` : "Terminé"}
                </Button>
              </div>
            </Card>
          );
        })}

        {tickets.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted-foreground">Aucun ticket SAV ouvert.</p>
        )}
      </div>
    </PageBody>
  );
}
