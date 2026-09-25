import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Link for dynamically built workspace paths (e.g. `/${kind}/referrals/${id}`).
 * Paths are always built from our own constants and ids, never from user input.
 */
export function AppLink({ to, children, className, ...rest }: { to: string; children: ReactNode; className?: string } & Omit<ComponentProps<typeof Link>, "to" | "children" | "className">) {
  return <Link to={to as "/"} className={className} {...rest}>{children}</Link>;
}

export function LinkButton({ to, children, variant = "outline", size = "sm" }: { to: string; children: ReactNode; variant?: "default" | "outline" | "ghost" | "secondary"; size?: "default" | "sm" | "lg" }) {
  return <Button asChild variant={variant} size={size}><Link to={to as "/"}>{children}</Link></Button>;
}
