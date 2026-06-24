import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-sidebar";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
