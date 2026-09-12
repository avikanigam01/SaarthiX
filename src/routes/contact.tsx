import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "./public-pages";
export const Route = createFileRoute("/contact")({ head: publicHead("/contact"), component: publicPage("/contact") });
