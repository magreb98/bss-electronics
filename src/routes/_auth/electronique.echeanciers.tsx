import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/electronique/echeanciers")({
  component: () => <Outlet />,
});
