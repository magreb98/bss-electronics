import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShoppingCart } from "lucide-react";
import { useState } from "react";

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
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — BSS POS" },
      {
        name: "description",
        content: "Connectez-vous à BSS POS pour gérer vos ventes d'appareils électroniques.",
      },
      { property: "og:title", content: "Connexion — BSS POS" },
      { property: "og:description", content: "Accès sécurisé au point de vente BSS POS." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  phone: z.string().min(9, "Numéro de téléphone invalide"),
  password: z.string().min(4, "Mot de passe requis"),
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setError(null);
    try {
      await login(values.phone, values.password);
      await navigate({ to: "/" });
    } catch {
      setError("Téléphone ou mot de passe incorrect.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-card px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="grid size-12 place-items-center rounded-[14px] bg-primary text-primary-foreground">
            <ShoppingCart className="size-6" aria-hidden />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">BSS POS</h1>
          <p className="text-[15px] text-muted-foreground">Connectez-vous à votre boutique</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+237 6XX XXX XXX"
                      className="min-h-[44px] rounded-[10px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="min-h-[44px] rounded-[10px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="min-h-[44px] w-full rounded-[10px] text-[15px] font-medium"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Se connecter
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
