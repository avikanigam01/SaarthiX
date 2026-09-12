import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/inventory")({
  head: portalHead("admin", "inventory"),
  component: portalComponent("admin", "inventory"),
});
