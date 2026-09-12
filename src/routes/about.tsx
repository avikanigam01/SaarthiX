import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/about")({ head: publicHead("/about"), component: publicPage("/about") });
