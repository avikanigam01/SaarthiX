import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/motion/theme-toggle";
import { SaarthiLogo } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { homePathForRoles } from "@/lib/roles";

const navLinks = [
  ["/how-it-works", "How it works"],
  ["/about", "About"],
  ["/contact", "Contact"],
  ["/privacy", "Safety & privacy"],
] as const;

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { status, roles } = useAuth();
  const signedIn = status === "signed_in";
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-prism-page text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" aria-label="SaarthiX home" className="transition-transform hover:scale-[1.03]"><SaarthiLogo /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map(([to, label]) => (
              <Link key={to} to={to} className="relative py-1 transition-colors hover:text-brand [&.active]:text-brand after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:scale-x-0 after:bg-gradient-prism after:transition-transform hover:after:scale-x-100">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 sm:flex">
              {signedIn ? (
                <Button asChild size="sm"><Link to={homePathForRoles(roles) as "/"}>My workspace</Link></Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
                  <Button asChild size="sm"><Link to="/register">Register</Link></Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
          </div>
        </div>
        <div className={`overflow-hidden border-t border-border/70 transition-[max-height] duration-300 ease-out md:hidden ${open ? "max-h-72" : "max-h-0 border-t-0"}`}>
          <nav className="flex flex-col gap-1 px-5 py-3 text-sm font-medium text-muted-foreground">
            {navLinks.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-muted hover:text-foreground">{label}</Link>)}
            <div className="mt-1 flex gap-2 px-2 pt-2 sm:hidden">
              {signedIn ? <Button asChild size="sm" className="flex-1"><Link to={homePathForRoles(roles) as "/"}>My workspace</Link></Button> : <><Button asChild variant="outline" size="sm" className="flex-1"><Link to="/login">Sign in</Link></Button><Button asChild size="sm" className="flex-1"><Link to="/register">Register</Link></Button></>}
            </div>
          </nav>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
      </header>
      {children}
      <footer className="border-t border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <SaarthiLogo compact />
          <span>Right Care. Right Place. Right Time.</span>
          <span>Decision-support, not diagnosis.</span>
        </div>
      </footer>
    </div>
  );
}

export { HomePage } from "@/components/landing/landing-page";

export { AuthPage } from "@/components/landing/auth-page";
