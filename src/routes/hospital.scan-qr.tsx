import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/scan-qr")({
  head: portalHead("hospital", "scan-qr"),
  component: portalComponent("hospital", "scan-qr"),
});
