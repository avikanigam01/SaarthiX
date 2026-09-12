import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/dashboard")({
  head: portalHead("admin", "dashboard"),
  component: portalComponent("admin", "dashboard"),
});
