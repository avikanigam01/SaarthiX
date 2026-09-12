import { createFileRoute } from "@tanstack/react-router";
import { publicHead, publicPage } from "./public-pages";
export const Route = createFileRoute("/about")({ head: publicHead("/about"), component: publicPage("/about") });
