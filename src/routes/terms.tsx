import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/terms")({ head: publicHead("/terms"), component: publicPage("/terms") });
