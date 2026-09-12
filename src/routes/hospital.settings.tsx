import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/settings")({
  head: portalHead("hospital", "settings"),
  component: portalComponent("hospital", "settings"),
});
