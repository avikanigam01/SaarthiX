import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { SaarthiLogo } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { homePathForRoles } from "@/lib/roles";

/** §45 — proper 403 page for authenticated users who lack the required role. */
export function AccessDenied({ inline = false }: { inline?: boolean }) {
  const { roles, status, signOut } = useAuth();
  const home = status === "signed_in" ? homePathForRoles(roles) : "/login";
  return (
    <div className={inline ? "grid min-h-[70vh] place-items-center px-4" : "grid min-h-screen place-items-center bg-prism-page px-4"}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        {!inline ? <div className="mb-6 flex justify-center"><SaarthiLogo /></div> : null}
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-danger">Error 403</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Access denied</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your account doesn't have permission to open this page. If you think this is a mistake, contact your administrator.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {status === "signed_in" && home !== "/403" ? (
            <Button asChild><Link to={home as "/"}>Go to my workspace</Link></Button>
          ) : (
            <Button asChild><Link to="/login">Sign in</Link></Button>
          )}
          {status === "signed_in" ? <Button variant="outline" onClick={() => void signOut()}>Sign out</Button> : null}
        </div>
      </div>
    </div>
  );
}
