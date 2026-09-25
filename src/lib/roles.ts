import type { UserRole } from "@/types/database";

export type PortalKind = "patient" | "hospital" | "coordinator" | "admin";

/** Which roles may open which workspace. Enforcement is in the database (RLS); this only routes the UI. */
export const PORTAL_ROLES: Record<PortalKind, readonly UserRole[]> = {
  patient: ["patient"],
  hospital: ["hospital_staff", "hospital_admin"],
  coordinator: ["referral_coordinator"],
  admin: ["government_admin", "super_admin"],
};

export const PORTAL_HOME: Record<PortalKind, string> = {
  patient: "/patient/dashboard",
  hospital: "/hospital/dashboard",
  coordinator: "/coordinator/dashboard",
  admin: "/admin/dashboard",
};

export function canAccessPortal(roles: readonly UserRole[], kind: PortalKind): boolean {
  return PORTAL_ROLES[kind].some((role) => roles.includes(role));
}

/** Highest-privilege workspace first. */
export function homePathForRoles(roles: readonly UserRole[]): string {
  if (canAccessPortal(roles, "admin")) return PORTAL_HOME.admin;
  if (canAccessPortal(roles, "coordinator")) return PORTAL_HOME.coordinator;
  if (canAccessPortal(roles, "hospital")) return PORTAL_HOME.hospital;
  if (canAccessPortal(roles, "patient")) return PORTAL_HOME.patient;
  return "/403";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: "Patient",
  hospital_staff: "Hospital staff",
  hospital_admin: "Hospital admin",
  referral_coordinator: "Referral coordinator",
  government_admin: "Government admin",
  super_admin: "Super admin",
};

export const PRIVILEGED_ROLES: readonly UserRole[] = ["government_admin", "super_admin"];

/** Only allow same-site relative paths after login (prevents open redirects). */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}
