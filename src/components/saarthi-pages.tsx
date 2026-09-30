import type { ReactNode } from "react";

import { NeonShell } from "@/components/landing/shell";

/** Chrome shared by every public page (header, footer, dark neon theme). */
export function PublicShell({ children }: { children: ReactNode }) {
  return <NeonShell>{children}</NeonShell>;
}

export { HomePage } from "@/components/landing/landing-page";

export { AuthPage } from "@/components/landing/auth-page";
