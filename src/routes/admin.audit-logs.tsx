import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/audit-logs")({
  head: portalHead("admin", "audit-logs"),
  component: portalComponent("admin", "audit-logs"),
});
