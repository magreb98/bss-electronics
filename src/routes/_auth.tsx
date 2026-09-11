import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { CashSessionProvider } from "@/hooks/use-cash-session";
import { PointOfSaleProvider } from "@/hooks/use-point-of-sale";
import { useAuth } from "@/hooks/use-auth";
import { getToken } from "@/lib/api";
import { canAccess, type Role } from "@/lib/rbac";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!getToken()) {
      void navigate({ to: "/connexion" });
      return;
    }

    if (!ready) return;

    const role = user?.role as Role | undefined;
    if (!canAccess(role, pathname)) {
      toast.error("Accès non autorisé pour votre rôle.");
      void navigate({ to: "/" });
    }
  }, [navigate, user, ready, pathname]);

  return (
    <PointOfSaleProvider>
      <CashSessionProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </CashSessionProvider>
    </PointOfSaleProvider>
  );
}
