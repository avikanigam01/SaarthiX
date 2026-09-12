import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/journey")({ head: portalHead("patient", "journey"), component: portalComponent("patient", "journey") });
