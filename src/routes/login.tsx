import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/saarthi-pages";
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — SaarthiX" }, { name: "description", content: "Sign in to continue your SaarthiX healthcare journey." }, { property: "og:title", content: "Sign in — SaarthiX" }, { property: "og:description", content: "Sign in to continue your SaarthiX healthcare journey." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <AuthPage mode="login" />,
});
