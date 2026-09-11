import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronRight, ClipboardList, FileText, Hospital, LayoutDashboard, Menu, Settings, ShieldCheck, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SaarthiLogo } from "@/components/saarthi-ui";

type PortalKind = "patient" | "hospital" | "coordinator" | "admin";

const portalConfig = {
  patient: {
    label: "Patient workspace",
    home: "/patient/dashboard",
    items: [
      ["Dashboard", "/patient/dashboard", LayoutDashboard], ["Assessment", "/patient/assessment", ClipboardList], ["Facilities", "/patient/facilities", Hospital], ["Journey", "/patient/journey", FileText], ["Referrals", "/patient/referrals", FileText], ["Visits", "/patient/visits", ClipboardList], ["Follow-ups", "/patient/followups", ClipboardList], ["Notifications", "/patient/notifications", Bell], ["Profile", "/patient/profile", Users], ["Settings", "/patient/settings", Settings],
    ],
  },
  hospital: {
    label: "Hospital workspace",
    home: "/hospital/dashboard",
    items: [
      ["Dashboard", "/hospital/dashboard", LayoutDashboard], ["Facility profile", "/hospital/profile", Hospital], ["Departments", "/hospital/departments", ClipboardList], ["Services", "/hospital/services", ClipboardList], ["Doctors", "/hospital/doctors", Users], ["Diagnostics", "/hospital/diagnostics", ClipboardList], ["Medicines", "/hospital/medicines", FileText], ["Referrals", "/hospital/referrals", FileText], ["Patients", "/hospital/patients", Users], ["Visits", "/hospital/visits", ClipboardList], ["Follow-ups", "/hospital/followups", ClipboardList], ["Notifications", "/hospital/notifications", Bell], ["Settings", "/hospital/settings", Settings],
    ],
  },
  coordinator: {
    label: "Coordinator workspace",
    home: "/coordinator/dashboard",
    items: [["Dashboard", "/coordinator/dashboard", LayoutDashboard], ["Referrals", "/coordinator/referrals", FileText], ["Patients", "/coordinator/patients", Users], ["Facilities", "/coordinator/facilities", Hospital], ["Notifications", "/coordinator/notifications", Bell]],
  },
  admin: {
    label: "Administration workspace",
    home: "/admin/dashboard",
    items: [["Dashboard", "/admin/dashboard", LayoutDashboard], ["Facilities", "/admin/facilities", Hospital], ["Users", "/admin/users", Users], ["Referrals", "/admin/referrals", FileText], ["Services", "/admin/services", ClipboardList], ["Inventory", "/admin/inventory", FileText], ["Analytics", "/admin/analytics", ClipboardList], ["Audit logs", "/admin/audit-logs", ShieldCheck], ["Settings", "/admin/settings", Settings]],
  },
} as const;

export function PortalShell({ kind, children }: { kind: PortalKind; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const config = portalConfig[kind];

  return (
    <div className="min-h-screen bg-prism-surface text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close navigation" : "Open navigation"}>{open ? <X /> : <Menu />}</Button><Link to={config.home} aria-label="Go to workspace home"><SaarthiLogo /></Link></div>
          <div className="hidden items-center gap-3 text-sm text-muted-foreground md:flex"><span>{config.label}</span><span className="size-1 rounded-full bg-border" /><span>Signed-in workspace</span></div>
          <div className="flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Open notifications"><Bell /></Button><Button asChild variant="outline" size="sm"><Link to="/">Exit workspace</Link></Button></div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-16 left-0 z-30 w-72 border-r border-border bg-card p-4 transition-transform lg:static lg:inset-auto lg:w-64 lg:translate-x-0 lg:bg-transparent`}>
          <nav className="space-y-1" aria-label={`${config.label} navigation`}>
            {config.items.map(([label, to, Icon]) => <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${pathname === to || pathname.startsWith(`${to}/`) ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" /><span>{label}</span>{pathname === to ? <ChevronRight className="ml-auto size-4" /> : null}</Link>)}
          </nav>
          <div className="mt-6 rounded-2xl border border-border bg-card/70 p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">SaarthiX safety</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Decision-support and care coordination, not diagnosis or autonomous treatment.</p></div>
        </aside>
        {open ? <button className="fixed inset-16 z-20 bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" /> : null}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}