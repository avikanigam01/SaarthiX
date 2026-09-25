import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { listAuthorizedPatients } from "@/services/patients";

/** Name lookup for patients the current user is authorised to see (facility staff / coordinator). */
export function usePatientDirectory(facilityId?: string) {
  const query = useQuery({
    queryKey: ["patient-directory", facilityId ?? "all"],
    queryFn: () => listAuthorizedPatients(facilityId),
  });
  const map = useMemo(() => new Map((query.data ?? []).map((p) => [p.id, p])), [query.data]);
  return {
    query,
    patients: query.data ?? [],
    nameOf: (id: string) => map.get(id)?.full_name ?? "Patient",
  };
}
