import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, ChevronRight, ClipboardList, FileText, Hospital, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AccessDenied } from "@/components/access-denied";
import { ErrorState, LoadingState, SaarthiLogo } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useAuth } from "@/lib/auth-context";
import { HospitalGate, useHospital } from "@/lib/facility-context";
import { canAccessPortal, ROLE_LABELS, type PortalKind } from "@/lib/roles";
import { countUnread } from "@/services/notifications";

export type { PortalKind };

const portalConfig = {
  patient: {
    label: "Patient workspace",
    home: "/patient/dashboard",
    notifications: "/patient/notifications",
    items: [
      ["Dashboard", "/patient/dashboard", LayoutDashboard], ["Assessment", "/patient/assessment", ClipboardList], ["Facilities", "/patient/facilities", Hospital], ["Journey", "/patient/journey", FileText], ["Referrals", "/patient/referrals", FileText], ["Visits", "/patient/visits", ClipboardList], ["Follow-ups", "/patient/followups", ClipboardList], ["Notifications", "/patient/notifications", Bell], ["Profile", "/patient/profile", Users], ["Settings", "/patient/settings", Settings],
    ],
  },
  hospital: {
    label: "Hospital workspace",
    home: "/hospital/dashboard",
    notifications: "/hospital/notifications",
    items: [
      ["Dashboard", "/hospital/dashboard", LayoutDashboard], ["Facility profile", "/hospital/profile", Hospital], ["Departments", "/hospital/departments", ClipboardList], ["Services", "/hospital/services", ClipboardList], ["Doctors", "/hospital/doctors", Users], ["Diagnostics", "/hospital/diagnostics", ClipboardList], ["Medicines", "/hospital/medicines", FileText], ["Referrals", "/hospital/referrals", FileText], ["Patients", "/hospital/patients", Users], ["Visits", "/hospital/visits", ClipboardList], ["Follow-ups", "/hospital/followups", ClipboardList], ["Notifications", "/hospital/notifications", Bell], ["Settings", "/hospital/settings", Settings],
    ],
  },
  coordinator: {
    label: "Coordinator workspace",
    home: "/coordinator/dashboard",
    notifications: "/coordinator/notifications",
    items: [["Dashboard", "/coordinator/dashboard", LayoutDashboard], ["Referrals", "/coordinator/referrals", FileText], ["Patients", "/coordinator/patients", Users], ["Facilities", "/coordinator/facilities", Hospital], ["Notifications", "/coordinator/notifications", Bell]],
  },
  admin: {
    label: "Administration workspace",
    home: "/admin/dashboard",
    notifications: "/admin/settings",
    items: [["Dashboard", "/admin/dashboard", LayoutDashboard], ["Facilities", "/admin/facilities", Hospital], ["Users", "/admin/users", Users], ["Referrals", "/admin/referrals", FileText], ["Services", "/admin/services", ClipboardList], ["Inventory", "/admin/inventory", FileText], ["Analytics", "/admin/analytics", ClipboardList], ["Audit logs", "/admin/audit-logs", ShieldCheck], ["Settings", "/admin/settings", Settings]],
  },
} as const;

function FullPage({ children }: { children: ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-prism-surface px-4"><div className="w-full max-w-md">{children}</div></div>;
}

/**
 * Workspace shell + client-side route guard.
 * The guard only decides what to *show*; every read and write is authorised again by Row Level
 * Security in the database, so bypassing this component gives no access to data.
 */
export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const { status, roles, profile, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (status === "signed_out") void navigate({ to: "/login", search: { redirect: pathname }, replace: true });
  }, [status, navigate, pathname]);

  if (status === "loading" || status === "signed_out") {
    return <FullPage><LoadingState label="Checking your session..." /></FullPage>;
  }
  if (status === "error") return <FullPage><ErrorState onRetry={() => void refresh()} /></FullPage>;

  if (profile && !profile.is_active) {
    return (
      <FullPage>
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold">Account deactivated</h1>
          <p className="mt-3 text-sm text-muted-foreground">This account has been deactivated. Please contact your administrator.</p>
          <Button className="mt-6" variant="outline" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </FullPage>
    );
  }

  if (!canAccessPortal(roles, kind)) return <AccessDenied />;

  if (kind === "hospital") {
    return <HospitalGate><Shell kind={kind}>{children}</Shell></HospitalGate>;
  }
  return <Shell kind={kind}>{children}</Shell>;
}

function FacilitySwitcher() {
  // Rendered only inside HospitalGate's provider tree (see Shell below).
  const { facilities, facility, selectFacility } = useHospital();
  if (facilities.length < 2) return <span className="truncate font-medium text-foreground">{facility.name}</span>;
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Active facility</span>
      <select
        value={facility.id}
        onChange={(e) => selectFacility(e.target.value)}
        className="h-9 max-w-[16rem] rounded-md border border-input bg-background px-2 text-sm"
      >
        {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </label>
  );
}

function Shell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, profile, roles, signOut } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const config = portalConfig[kind];
  const userId = user?.id ?? "";

  const unread = useQuery({ queryKey: ["unread-count", userId], queryFn: () => countUnread(userId), enabled: Boolean(userId), refetchInterval: 120_000 });
  useRealtimeInvalidate("notifications", [["unread-count", userId], ["notifications", userId]], { filter: `user_id=eq.${userId}`, enabled: Boolean(userId) });

  const unreadCount = unread.data ?? 0;
  const roleLabel = roles.filter((r) => ROLE_LABELS[r]).map((r) => ROLE_LABELS[r]).find(Boolean);

  return (
    <div className="min-h-screen bg-prism-surface text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2">Skip to main content</a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
            <Link to={config.home} aria-label="Go to workspace home"><SaarthiLogo /></Link>
          </div>
          <div className="hidden min-w-0 items-center gap-3 text-sm text-muted-foreground md:flex">
            {kind === "hospital" ? <FacilitySwitcher /> : <span>{config.label}</span>}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {kind !== "admin" ? (
              <Button asChild variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
                <Link to={config.notifications}>
                  <Bell />
                  {unreadCount > 0 ? <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
                </Link>
              </Button>
            ) : null}
            <div className="hidden text-right leading-tight sm:block">
              <p className="max-w-[10rem] truncate text-sm font-medium">{profile?.full_name ?? "Account"}</p>
              {roleLabel ? <p className="text-xs text-muted-foreground">{roleLabel}</p> : null}
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()}><LogOut aria-hidden="true" /><span className="hidden sm:inline">Sign out</span><span className="sr-only sm:hidden">Sign out</span></Button>
          </div>
        </div>
        {kind === "hospital" ? <div className="border-t border-border/60 px-4 py-2 text-sm md:hidden"><FacilitySwitcher /></div> : null}
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-16 left-0 z-30 w-72 overflow-y-auto border-r border-border bg-card p-4 transition-transform lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-4rem)] lg:w-64 lg:shrink-0 lg:translate-x-0 lg:bg-transparent`}>
          <nav className="space-y-1" aria-label={`${config.label} navigation`}>
            {config.items.map(([label, to, Icon]) => {
              const active = pathname === to || pathname.startsWith(`${to}/`);
              return (
                <Link key={to} to={to} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon className="size-4" aria-hidden="true" /><span>{label}</span>{pathname === to ? <ChevronRight className="ml-auto size-4" aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">SaarthiX safety</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Decision-support and care coordination, not diagnosis or autonomous treatment.</p></div>
        </aside>
        {open ? <button className="fixed inset-x-0 bottom-0 top-16 z-20 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" /> : null}
        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
