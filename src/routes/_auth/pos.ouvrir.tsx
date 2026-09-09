import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useCashSession } from "@/hooks/use-cash-session";

export const Route = createFileRoute("/_auth/pos/ouvrir")({
  head: () => ({
    meta: [
      { title: "Ouvrir une session caisse — BSS POS" },
      {
        name: "description",
        content: "Sélectionnez une caisse et saisissez le fond de caisse pour démarrer les ventes.",
      },
      { property: "og:title", content: "Ouvrir une session caisse — BSS POS" },
      { property: "og:description", content: "Démarrez votre journée de vente en une étape." },
    ],
  }),
  component: OpenSessionPage,
});

const registers = ["Caisse 1 — Comptoir", "Caisse 2 — Étage", "Caisse mobile"];

const schema = z.object({
  cash_register: z.string().min(1, "Sélectionnez une caisse"),
  opening_float: z.coerce.number().int("Montant entier requis").min(0, "Montant invalide"),
});

function OpenSessionPage() {
  const navigate = useNavigate();
  const { open } = useCashSession();

  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { cash_register: registers[0] ?? "", opening_float: 0 },
  });

  const onSubmit = async (values: z.output<typeof schema>) => {
    await open(values);
    toast.success("Session caisse ouverte");
    await navigate({ to: "/pos" });
  };

  return (
    <PageBody>
      <PageHeader
        title="Ouvrir une session de caisse"
        description="Une session active est requise pour encaisser des ventes."
      />
      <Card className="max-w-[520px] gap-0 rounded-[16px] border-border p-5 shadow-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="cash_register"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caisse</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="min-h-[44px] rounded-[10px]">
                        <SelectValue placeholder="Choisir une caisse" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {registers.map((r) => (
                        <SelectItem key={r} value={r} className="min-h-[44px]">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="opening_float"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fond de caisse (XAF)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      className="tabular min-h-[44px] rounded-[10px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="min-h-[44px] rounded-[10px] font-medium"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Ouvrir la session
            </Button>
          </form>
        </Form>
      </Card>
    </PageBody>
  );
}
