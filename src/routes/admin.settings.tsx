import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/settings")({
  head: portalHead("admin", "settings"),
  component: portalComponent("admin", "settings"),
});
