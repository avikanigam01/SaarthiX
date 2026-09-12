import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saarthi-pages";
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — SaarthiX" }, { name: "description", content: "Choose a new password for your SaarthiX account." }, { property: "og:title", content: "Choose a new password — SaarthiX" }, { property: "og:description", content: "Choose a new password for your SaarthiX account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <AuthPage mode="reset" />,
});
