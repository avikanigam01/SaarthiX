import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/departments")({
  head: portalHead("hospital", "departments"),
  component: portalComponent("hospital", "departments"),
});
