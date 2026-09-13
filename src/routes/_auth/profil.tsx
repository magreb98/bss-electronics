import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageBody, PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { request, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/rbac";

export const Route = createFileRoute("/_auth/profil")({
  head: () => ({ meta: [{ title: "Mon profil — BSS POS" }] }),
  component: ProfilPage,
});

const ROLE_BADGE: Record<Role, "outline" | "secondary" | "default"> = {
  vendeur: "outline",
  gerant: "secondary",
  proprietaire: "default",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function ProfilPage() {
  const { user } = useAuth();
  const mustChangePassword = user?.must_change_password ?? false;
  // user.role is typed as the 3-value Role union, but the API can in
  // practice return other role names (e.g. a seeded "admin" test account) —
  // only trust it as a known Role if it's actually a key in ROLE_LABELS,
  // otherwise fall back to displaying the raw string instead of a blank badge.
  const knownRole =
    user?.role && user.role in ROLE_LABELS ? (user.role as Role) : undefined;

  return (
    <PageBody>
      <PageHeader title="Mon profil" />

      {mustChangePassword ? (
        <div className="flex items-start gap-3 rounded-[14px] border border-warning/25 bg-warning/10 px-4 py-3">
          <ShieldAlert className="mt-0.5 size-[18px] shrink-0 text-warning" aria-hidden />
          <p className="text-[13px] leading-relaxed text-foreground">
            Pour la sécurité de votre compte, vous devez choisir un nouveau mot de passe avant de
            continuer.
          </p>
        </div>
      ) : null}

      <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
        <p className="text-[15px] font-semibold">Informations</p>
        {user ? (
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/12">
              <span className="text-[18px] font-semibold text-primary">{initials(user.name)}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[16px] font-medium">{user.name}</p>
                {user.role ? (
                  <Badge variant={knownRole ? ROLE_BADGE[knownRole] : "outline"}>
                    {knownRole ? ROLE_LABELS[knownRole] : user.role}
                  </Badge>
                ) : null}
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Téléphone</dt>
                  <dd className="mt-0.5">{user.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dernière connexion</dt>
                  <dd className="mt-0.5">
                    {user.last_connected_at ? formatDateTime(user.last_connected_at) : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : null}
        <p className="border-t border-border pt-4 text-[12px] text-muted-foreground">
          Pour modifier votre nom ou votre numéro de téléphone, contactez votre gérant.
        </p>
      </Card>

      <MotDePasseCard forced={mustChangePassword} />
    </PageBody>
  );
}

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Mot de passe actuel requis"),
    new_password: z.string().min(8, "8 caractères minimum"),
    new_password_confirmation: z.string().min(1, "Confirmez le nouveau mot de passe"),
  })
  .refine((v) => v.new_password === v.new_password_confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["new_password_confirmation"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

function MotDePasseCard({ forced }: { forced: boolean }) {
  const { refreshUser } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", new_password_confirmation: "" },
  });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await request("/commerce/auth/change-password", { method: "POST", body: values });
      toast.success("Mot de passe mis à jour.");
      form.reset();
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiError && err.code === "INVALID_CURRENT_PASSWORD") {
        form.setError("current_password", { message: err.message });
        return;
      }
      if (err instanceof ApiError && err.errors) {
        Object.entries(err.errors).forEach(([field, messages]) =>
          form.setError(field as keyof PasswordValues, { message: messages[0] ?? "Invalide" }),
        );
        return;
      }
      toast.error("Une erreur est survenue. Réessayez.");
    }
  };

  return (
    <Card className="gap-4 rounded-[16px] border-border p-5 shadow-none">
      <div>
        <p className="text-[15px] font-semibold">Mot de passe</p>
        <p className="text-[13px] text-muted-foreground">Utilisez un mot de passe d'au moins 8 caractères.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-sm flex-col gap-4">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mot de passe actuel</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      className="min-h-[44px] rounded-[10px] pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label={showCurrent ? "Masquer" : "Afficher"}
                    >
                      {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nouveau mot de passe</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                      className="min-h-[44px] rounded-[10px] pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? "Masquer" : "Afficher"}
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_password_confirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Répétez le mot de passe"
                      className="min-h-[44px] rounded-[10px] pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? "Masquer" : "Afficher"}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="min-h-[44px] gap-2 rounded-[10px] text-[15px] font-medium"
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ShieldCheck className="size-4" aria-hidden />
            )}
            {forced ? "Choisir ce mot de passe" : "Mettre à jour le mot de passe"}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
