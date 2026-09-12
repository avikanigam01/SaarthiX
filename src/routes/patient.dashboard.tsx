import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/dashboard")({ head: portalHead("patient", "dashboard"), component: portalComponent("patient", "dashboard") });
