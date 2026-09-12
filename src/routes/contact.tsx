import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/contact")({ head: publicHead("/contact"), component: publicPage("/contact") });
