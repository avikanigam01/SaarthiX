import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saarthi-pages";
export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your password — SaarthiX" }, { name: "description", content: "Request a secure password reset for your SaarthiX account." }, { property: "og:title", content: "Reset your password — SaarthiX" }, { property: "og:description", content: "Request a secure password reset for your SaarthiX account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <AuthPage mode="forgot" />,
});
