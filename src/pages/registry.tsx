import { lazy, type ComponentType, type LazyExoticComponent } from "react";

import { EmptyState } from "@/components/saarthi-ui";

type Page = LazyExoticComponent<ComponentType>;

/**
 * Every workspace page, code-split. Keys are "<workspace>/<page>" or "<workspace>/<page>/$id".
 * Routes (src/routes/*) look their page up here via pageFor() — see src/lib/saarthi-routes.tsx.
 */
const pages: Record<string, Page> = {
  "public/about": lazy(() => import("@/pages/public/about")),
  "public/contact": lazy(() => import("@/pages/public/contact")),
  "public/how-it-works": lazy(() => import("@/pages/public/how-it-works")),
  "public/privacy": lazy(() => import("@/pages/public/privacy")),
  "public/terms": lazy(() => import("@/pages/public/terms")),

  "patient/dashboard": lazy(() => import("@/pages/patient/dashboard")),
  "patient/assessment": lazy(() => import("@/pages/patient/assessment")),
  "patient/facilities": lazy(() => import("@/pages/patient/facilities")),
  "patient/facilities/$id": lazy(() => import("@/pages/patient/facilities-detail")),
  "patient/journey": lazy(() => import("@/pages/patient/journey")),
  "patient/journey/$id": lazy(() => import("@/pages/patient/journey-detail")),
  "patient/referrals": lazy(() => import("@/pages/patient/referrals")),
  "patient/referrals/$id": lazy(() => import("@/pages/patient/referrals-detail")),
  "patient/visits": lazy(() => import("@/pages/patient/visits")),
  "patient/followups": lazy(() => import("@/pages/patient/followups")),
  "patient/followups/$id": lazy(() => import("@/pages/patient/followups-detail")),
  "patient/notifications": lazy(() => import("@/pages/patient/notifications")),
  "patient/profile": lazy(() => import("@/pages/patient/profile")),
  "patient/settings": lazy(() => import("@/pages/patient/settings")),

  "hospital/dashboard": lazy(() => import("@/pages/hospital/dashboard")),
  "hospital/profile": lazy(() => import("@/pages/hospital/profile")),
  "hospital/departments": lazy(() => import("@/pages/hospital/departments")),
  "hospital/services": lazy(() => import("@/pages/hospital/services")),
  "hospital/doctors": lazy(() => import("@/pages/hospital/doctors")),
  "hospital/diagnostics": lazy(() => import("@/pages/hospital/diagnostics")),
  "hospital/medicines": lazy(() => import("@/pages/hospital/medicines")),
  "hospital/referrals": lazy(() => import("@/pages/hospital/referrals")),
  "hospital/referrals/$id": lazy(() => import("@/pages/hospital/referrals-detail")),
  "hospital/patients": lazy(() => import("@/pages/hospital/patients")),
  "hospital/patients/$id": lazy(() => import("@/pages/hospital/patients-detail")),
  "hospital/visits": lazy(() => import("@/pages/hospital/visits")),
  "hospital/followups": lazy(() => import("@/pages/hospital/followups")),
  "hospital/notifications": lazy(() => import("@/pages/hospital/notifications")),
  "hospital/settings": lazy(() => import("@/pages/hospital/settings")),

  "coordinator/dashboard": lazy(() => import("@/pages/coordinator/dashboard")),
  "coordinator/referrals": lazy(() => import("@/pages/coordinator/referrals")),
  "coordinator/referrals/$id": lazy(() => import("@/pages/coordinator/referrals-detail")),
  "coordinator/patients": lazy(() => import("@/pages/coordinator/patients")),
  "coordinator/patients/$id": lazy(() => import("@/pages/coordinator/patients-detail")),
  "coordinator/facilities": lazy(() => import("@/pages/coordinator/facilities")),
  "coordinator/facilities/$id": lazy(() => import("@/pages/coordinator/facilities-detail")),
  "coordinator/notifications": lazy(() => import("@/pages/coordinator/notifications")),

  "admin/dashboard": lazy(() => import("@/pages/admin/dashboard")),
  "admin/facilities": lazy(() => import("@/pages/admin/facilities")),
  "admin/facilities/$id": lazy(() => import("@/pages/admin/facility-detail")),
  "admin/users": lazy(() => import("@/pages/admin/users")),
  "admin/users/$id": lazy(() => import("@/pages/admin/user-detail")),
  "admin/referrals": lazy(() => import("@/pages/admin/referrals")),
  "admin/referrals/$id": lazy(() => import("@/pages/admin/referrals-detail")),
  "admin/services": lazy(() => import("@/pages/admin/services")),
  "admin/inventory": lazy(() => import("@/pages/admin/inventory")),
  "admin/analytics": lazy(() => import("@/pages/admin/analytics")),
  "admin/audit-logs": lazy(() => import("@/pages/admin/audit-logs")),
  "admin/settings": lazy(() => import("@/pages/admin/settings")),
};

export function pageFor(key: string): Page | ComponentType {
  return pages[key] ?? (() => <EmptyState title="This page isn't available." description="The page you requested could not be found." />);
}
