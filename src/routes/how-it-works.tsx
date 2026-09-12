import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/how-it-works")({ head: publicHead("/how-it-works"), component: publicPage("/how-it-works") });
