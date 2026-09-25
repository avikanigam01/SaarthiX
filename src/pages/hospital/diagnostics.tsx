import { CatalogManagerPage } from "@/pages/shared/catalog-manager";
export default function HospitalDiagnosticsPage() {
  return <CatalogManagerPage resource="diagnostics" title="Diagnostic services" noun="Diagnostic service" description="Tests and scans available at your facility, with when each was last confirmed." />;
}
