import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { request } from "@/lib/api";
import type { BackendProduct } from "@/lib/types";

export const Route = createFileRoute("/_auth/electronique/fiches/$id")({
  head: () => ({
    meta: [
      { title: "Fiche technique — BSS POS" },
      { property: "og:title", content: "Fiche technique — BSS POS" },
    ],
  }),
  component: DeviceSpecDetailPage,
});

interface BackendDeviceSpec {
  id?: string;
  product_id?: string;
  cpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  screen?: string | null;
  battery?: string | null;
  connectivity?: string | null;
  os?: string | null;
}

const schema = z.object({
  cpu:          z.string(),
  ram:          z.string(),
  storage:      z.string(),
  screen:       z.string(),
  battery:      z.string(),
  connectivity: z.string(),
  os:           z.string(),
});

function DeviceSpecDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: () =>
      request<{ data: BackendProduct }>(`/commerce/products/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 60_000,
  });

  const { data: spec } = useQuery({
    queryKey: ["device-spec", id],
    queryFn: () =>
      request<{ data: BackendDeviceSpec }>(`/electronics/device-specs/${id}`)
        .then((r) => r.data)
        .catch(() => null),
    staleTime: 60_000,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      cpu:          "",
      ram:          "",
      storage:      "",
      screen:       "",
      battery:      "",
      connectivity: "",
      os:           "",
    },
  });

  useEffect(() => {
    if (spec) {
      form.reset({
        cpu:          spec.cpu ?? "",
        ram:          spec.ram ?? "",
        storage:      spec.storage ?? "",
        screen:       spec.screen ?? "",
        battery:      spec.battery ?? "",
        connectivity: spec.connectivity ?? "",
        os:           spec.os ?? "",
      });
    }
  }, [spec, form]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await request(`/electronics/device-specs/${id}`, { method: "PUT", body: values });
      toast.success("Fiche technique enregistrée");
      void qc.invalidateQueries({ queryKey: ["device-spec", id] });
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string };
      if (e?.errors) {
        Object.entries(e.errors).forEach(([f, msgs]) =>
          form.setError(f as keyof z.infer<typeof schema>, { message: msgs[0] ?? "Invalide" }),
        );
      } else {
        toast.error(e?.message ?? "Erreur lors de l'enregistrement");
      }
    }
  };

  if (loadingProduct) {
    return (
      <PageBody>
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-64 rounded-[16px]" />
      </PageBody>
    );
  }

  const title = product?.label ?? id;
  const subtitle = product?.reference ? `Fiche technique · ${product.reference}` : "Fiche technique";

  return (
    <PageBody>
      <PageHeader
        title={title}
        description={subtitle}
        action={
          <Button
            type="submit"
            form="spec-form"
            className="min-h-[44px] rounded-[10px] px-6"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Enregistrer
          </Button>
        }
      />

      <Link to="/electronique/fiches" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
        <ArrowLeft className="size-3.5" aria-hidden />
        Retour aux fiches
      </Link>

      <Form {...form}>
        <form id="spec-form" onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
            <p className="text-[17px] font-semibold tracking-tight">Caractéristiques techniques</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["cpu", "Processeur"],
                  ["ram", "RAM"],
                  ["storage", "Stockage"],
                  ["screen", "Écran"],
                  ["battery", "Batterie"],
                  ["connectivity", "Connectivité"],
                  ["os", "Système d'exploitation"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input className="min-h-[44px] rounded-[10px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </Card>
        </form>
      </Form>
    </PageBody>
  );
}
