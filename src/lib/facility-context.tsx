import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { listMyFacilities } from "@/services/facilities";
import type { Facility } from "@/types/database";

type HospitalContextValue = {
  facilities: Facility[];
  facility: Facility;
  selectFacility: (id: string) => void;
};

const HospitalContext = createContext<HospitalContextValue | null>(null);
const STORAGE_KEY = "saarthix.activeFacility";
const NO_FACILITIES: Facility[] = [];

function GateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-prism-surface px-4">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

/**
 * Hospital users may be linked to several facilities. Everything in the hospital workspace is scoped
 * to the selected one. Authorization itself is enforced by RLS (public.is_facility_staff) — this only
 * chooses which of the user's own facilities to work on.
 */
export function HospitalGate({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const query = useQuery({ queryKey: ["staff-facilities", userId], queryFn: () => listMyFacilities(userId), enabled: Boolean(userId) });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelectedId(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const facilities = query.data ?? NO_FACILITIES;
  const facility = facilities.find((f) => f.id === selectedId) ?? facilities[0] ?? null;

  const value = useMemo<HospitalContextValue | null>(
    () =>
      facility
        ? {
            facilities,
            facility,
            selectFacility: (id: string) => {
              setSelectedId(id);
              try {
                window.localStorage.setItem(STORAGE_KEY, id);
              } catch {
                /* ignore */
              }
            },
          }
        : null,
    [facilities, facility],
  );

  if (query.isLoading) return <GateFrame><LoadingState label="Loading your facility..." /></GateFrame>;
  if (query.isError) return <GateFrame><ErrorState onRetry={() => void query.refetch()} /></GateFrame>;
  if (!value) {
    return (
      <GateFrame><EmptyState
        action={<Button variant="outline" onClick={() => void signOut()}>Sign out</Button>}
        icon={Building2}
        title="Your account isn't linked to a facility yet."
        description="A platform administrator must associate your account with a verified facility before you can manage it. Please contact your administrator."
      /></GateFrame>
    );
  }
  return <HospitalContext.Provider value={value}>{children}</HospitalContext.Provider>;
}

export function useHospital(): HospitalContextValue {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error("useHospital must be used inside the hospital workspace.");
  return ctx;
}

export function useFacility(): Facility {
  return useHospital().facility;
}

/** Like useHospital(), but returns null outside the hospital workspace (for components shared across workspaces). */
export function useOptionalHospital(): HospitalContextValue | null {
  return useContext(HospitalContext);
}
