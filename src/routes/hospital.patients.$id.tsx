import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/patients/$id")({
  head: portalHead("hospital", "patients"),
  component: detailComponent("hospital", "patients"),
});
