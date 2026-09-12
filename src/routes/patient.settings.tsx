import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/settings")({ head: portalHead("patient", "settings"), component: portalComponent("patient", "settings") });
