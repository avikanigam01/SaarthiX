import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/visits")({ head: portalHead("patient", "visits"), component: portalComponent("patient", "visits") });
