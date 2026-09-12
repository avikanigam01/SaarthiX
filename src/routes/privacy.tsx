import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "./public-pages";
export const Route = createFileRoute("/privacy")({ head: publicHead("/privacy"), component: publicPage("/privacy") });
