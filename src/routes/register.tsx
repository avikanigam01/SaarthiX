import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saarthi-pages";
export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create an account — SaarthiX" }, { name: "description", content: "Create a secure SaarthiX account for coordinated healthcare access." }, { property: "og:title", content: "Create an account — SaarthiX" }, { property: "og:description", content: "Create a secure SaarthiX account for coordinated healthcare access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <AuthPage mode="register" />,
});
