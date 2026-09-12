import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/facilities")({
  head: portalHead("admin", "facilities"),
  component: portalComponent("admin", "facilities"),
});
