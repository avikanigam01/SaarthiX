import { createFileRoute } from "@tanstack/react-router";
import { patientRoute } from "./patient-pages";
export const Route = createFileRoute("/patient/journey")(patientRoute("/patient/journey"));
