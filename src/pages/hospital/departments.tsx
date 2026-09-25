import { CatalogManagerPage } from "@/pages/shared/catalog-manager";
export default function HospitalDepartmentsPage() {
  return <CatalogManagerPage resource="departments" title="Departments" noun="Department" description="The departments patients can be seen in. Keep availability current — patients rely on it." />;
}
