import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Backdrop, NeonChip, type Tone } from "@/components/landing/neon-ui";
import { EcgLine } from "@/components/motion/ecg";
import { Reveal } from "@/components/motion/primitives";
import { SaarthiLogo } from "@/components/saarthi-ui";
import { useAuth } from "@/lib/auth-context";
import { homePathForRoles } from "@/lib/roles";
import { cn } from "@/lib/utils";

const sectionAnchors = [["#how-it-works", "How it works"], ["#capabilities", "Capabilities"], ["#institutions", "For you"], ["#faq", "FAQ"]] as const;
const pageLinks = [["/how-it-works", "How it works"], ["/about", "About"]] as const;
const linkClass = "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-[var(--nl-cyan)] [&.active]:text-[var(--nl-cyan)]";

/** Sticky header. `anchors` swaps the page links for in-page section links (used on the home page). */
export function NeonHeader({ anchors = false }: { anchors?: boolean }) {
  const { status, roles } = useAuth();
  const signedIn = status === "signed_in";
  const [open, setOpen] = useState(false);

  const items = (onClick?: () => void, extra = "") => (
    <>
      {anchors
        ? sectionAnchors.map(([href, label]) => <a key={href} href={href} onClick={onClick} className={cn(linkClass, extra)}>{label}</a>)
        : pageLinks.map(([to, label]) => <Link key={to} to={to} onClick={onClick} className={cn(linkClass, extra)}>{label}</Link>)}
      <Link to="/privacy" onClick={onClick} className={cn(linkClass, extra)}>Safety & privacy</Link>
      <Link to="/contact" onClick={onClick} className={cn(linkClass, extra)}>Contact</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(0.135_0.045_265/0.75)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="SaarthiX home" className="transition-transform hover:scale-[1.03]"><SaarthiLogo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">{items()}</nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {signedIn ? (
              <Link to={homePathForRoles(roles) as "/"} className="nl-btn inline-flex h-9 items-center rounded-full px-5 text-sm">My workspace</Link>
            ) : (
              <>
                <Link to="/login" className="nl-btn-ghost inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold">Sign in</Link>
                <Link to="/register" className="nl-btn inline-flex h-9 items-center rounded-full px-5 text-sm">Register</Link>
              </>
            )}
          </div>
          <button type="button" className="grid size-9 place-items-center rounded-full text-foreground hover:bg-white/10 md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <div className={cn("overflow-hidden border-white/10 transition-[max-height] duration-300 ease-out md:hidden", open ? "max-h-96 border-t" : "max-h-0")}>
        <nav className="flex flex-col gap-1 px-5 py-3" aria-label="Mobile">
          {items(() => setOpen(false), "py-2.5")}
          <div className="mt-2 flex gap-2">
            {signedIn ? <Link to={homePathForRoles(roles) as "/"} className="nl-btn inline-flex h-10 flex-1 items-center justify-center rounded-full text-sm">My workspace</Link> : (
              <>
                <Link to="/login" className="nl-btn-ghost inline-flex h-10 flex-1 items-center justify-center rounded-full text-sm font-semibold">Sign in</Link>
                <Link to="/register" className="nl-btn inline-flex h-10 flex-1 items-center justify-center rounded-full text-sm">Register</Link>
              </>
            )}
          </div>
        </nav>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--nl-cyan)] to-transparent opacity-60" />
    </header>
  );
}

export function NeonFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <SaarthiLogo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Right Care. Right Place. Right Time. A healthcare access and referral-coordination platform.</p>
        </div>
        <nav aria-label="Explore" className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span className="font-display text-sm font-semibold text-foreground">Explore</span>
          <Link to="/how-it-works" className="hover:text-[var(--nl-cyan)]">How it works</Link>
          <Link to="/about" className="hover:text-[var(--nl-cyan)]">About</Link>
          <Link to="/contact" className="hover:text-[var(--nl-cyan)]">Contact</Link>
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span className="font-display text-sm font-semibold text-foreground">Trust</span>
          <Link to="/privacy" className="hover:text-[var(--nl-cyan)]">Safety & privacy</Link>
          <Link to="/terms" className="hover:text-[var(--nl-cyan)]">Terms</Link>
          <span>Decision-support, not diagnosis.</span>
        </nav>
      </div>
    </footer>
  );
}

/** Dark page frame: skip link, header, content, footer. Pages supply their own <main id="main">. */
export function NeonShell({ children, anchors = false }: { children: ReactNode; anchors?: boolean }) {
  return (
    <div className="dark nl-root flex min-h-screen flex-col text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--nl-cyan)] focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
      <NeonHeader anchors={anchors} />
      <div className="flex-1">{children}</div>
      <NeonFooter />
    </div>
  );
}

/** Top-of-page banner for inner pages: badge, headline, intro, animated heartbeat line. */
export function PageHero({
  badge, icon, tone = "cyan", title, accent, description, children,
}: { badge: string; icon: LucideIcon; tone?: Tone; title: string; accent?: string; description: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <Backdrop />
      <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8 sm:py-24">
        <Reveal on="mount"><NeonChip icon={icon} tone={tone}>{badge}</NeonChip></Reveal>
        <Reveal on="mount" delay={0.08}>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {title}{accent ? <> <span className="nl-neon-text">{accent}</span></> : null}
          </h1>
        </Reveal>
        <Reveal on="mount" delay={0.16}><p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p></Reveal>
        {children ? <Reveal on="mount" delay={0.24}><div className="mt-8 flex flex-wrap justify-center gap-3.5">{children}</div></Reveal> : null}
        <Reveal on="mount" delay={0.32}><EcgLine className="mx-auto mt-10 h-10 max-w-sm text-[var(--nl-mint)] drop-shadow-[0_0_6px_var(--nl-mint)]" /></Reveal>
      </div>
    </section>
  );
}
