import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { CashSessionProvider } from "@/hooks/use-cash-session";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) void navigate({ to: "/connexion" });
  }, [navigate]);

  return (
    <CashSessionProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CashSessionProvider>
  );
}
