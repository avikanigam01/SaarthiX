import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader, Panel } from "@/components/data/layout";
import { CheckField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { toUserMessage } from "@/lib/errors";
import { useFacility } from "@/lib/facility-context";
import { formatDate } from "@/lib/format";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/validation";
import { updateFacility } from "@/services/facilities";
import type { OperatingHours } from "@/types/database";

const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]] as const;
type Hours = Record<string, { open: string; close: string; closed: boolean }>;

const coord = (label: string, min: number, max: number) => z.string().trim().refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), `${label} must be between ${min} and ${max}.`);
const schema = z.object({
  name: z.string().trim().min(2, "Enter the facility name.").max(160),
  facility_type: z.string().trim().min(2, "Enter the facility type.").max(80),
  registration_number: z.string().trim().max(80),
  address: z.string().trim().min(3, "Enter the address.").max(300),
  district: z.string().trim().min(2, "Enter the district.").max(80),
  state: z.string().trim().min(2, "Enter the state.").max(80),
  postal_code: z.string().trim().max(12),
  phone: z.string().trim().refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number."),
  email: z.string().trim().refine((v) => v === "" || EMAIL_PATTERN.test(v), "Enter a valid email address."),
  latitude: coord("Latitude", -90, 90),
  longitude: coord("Longitude", -180, 180),
});

function toHours(source: OperatingHours | null): Hours {
  const hours: Hours = {};
  for (const [key] of DAYS) {
    const raw = source?.[key];
    hours[key] = raw && typeof raw === "object" ? { open: raw.open ?? "09:00", close: raw.close ?? "17:00", closed: Boolean(raw.closed) } : { open: "09:00", close: "17:00", closed: raw === undefined ? false : true };
  }
  return hours;
}

export default function HospitalProfilePage() {
  const facility = useFacility();
  const queryClient = useQueryClient();
  const form = useZodForm(schema, { name: "", facility_type: "", registration_number: "", address: "", district: "", state: "", postal_code: "", phone: "", email: "", latitude: "", longitude: "" });
  const [hours, setHours] = useState<Hours>(() => toHours(facility.operating_hours));
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [hoursTouched, setHoursTouched] = useState(false);

  useEffect(() => {
    form.reset({ name: facility.name, facility_type: facility.facility_type, registration_number: facility.registration_number ?? "", address: facility.address, district: facility.district, state: facility.state, postal_code: facility.postal_code ?? "", phone: facility.phone ?? "", email: facility.email ?? "", latitude: facility.latitude == null ? "" : String(facility.latitude), longitude: facility.longitude == null ? "" : String(facility.longitude) });
    setHours(toHours(facility.operating_hours));
    setHoursTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility.id, facility.updated_at]);

  const save = useMutation({
    mutationFn: async () => {
      const v = form.validate();
      if (!v) throw new Error("validation");
      for (const [k, label] of hoursTouched ? DAYS : []) {
        const h = hours[k];
        if (h && !h.closed && h.close <= h.open) { setHoursError(`${label}: closing time must be after opening time.`); throw new Error("validation"); }
      }
      setHoursError(null);
      const operating: OperatingHours = {};
      for (const [k] of DAYS) { const h = hours[k]; if (h) operating[k] = h.closed ? { open: "00:00", close: "00:00", closed: true } : { open: h.open, close: h.close }; }
      return updateFacility(facility.id, {
        name: v.name, facility_type: v.facility_type, registration_number: emptyToNull(v.registration_number), address: v.address, district: v.district, state: v.state,
        postal_code: emptyToNull(v.postal_code), phone: emptyToNull(v.phone), email: emptyToNull(v.email),
        latitude: v.latitude === "" ? null : Number(v.latitude), longitude: v.longitude === "" ? null : Number(v.longitude), ...(hoursTouched ? { operating_hours: operating } : {}),
      });
    },
    onSuccess: () => { toast.success("Facility profile saved."); void queryClient.invalidateQueries({ queryKey: ["staff-facilities"] }); },
    onError: (e) => { if ((e as Error).message !== "validation") toast.error(toUserMessage(e, "We couldn't save the facility profile.")); },
  });

  return (
    <>
      <PageHeader eyebrow="Facility" title="Facility profile" description="This information is shown to patients searching for care. Verification status can only be changed by an administrator." />
      <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${facility.is_verified ? "border-success/30 bg-success-soft text-success-foreground" : "border-warning/30 bg-warning-soft text-warning-foreground"}`}>
        <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>{facility.is_verified ? `Verified${facility.verified_at ? ` on ${formatDate(facility.verified_at)}` : ""}. Your facility appears in patient search.` : "Your facility hasn't been verified yet, so patients can't find it. Complete your profile and ask your administrator to verify it."}</p>
      </div>
      <form noValidate onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-6">
        <Panel title="Basic details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Facility name" required {...form.bind("name")} />
            <TextField label="Facility type" required placeholder="e.g. District Hospital" {...form.bind("facility_type")} />
            <TextField label="Registration number" {...form.bind("registration_number")} />
            <TextField label="Phone" type="tel" {...form.bind("phone")} />
            <TextField label="Email" type="email" {...form.bind("email")} />
          </div>
        </Panel>
        <Panel title="Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField className="sm:col-span-2" label="Address" required {...form.bind("address")} />
            <TextField label="District" required {...form.bind("district")} />
            <TextField label="State" required {...form.bind("state")} />
            <TextField label="Postal code" {...form.bind("postal_code")} />
            <span />
            <TextField label="Latitude" inputMode="decimal" hint="Optional. Enables distance sorting." {...form.bind("latitude")} />
            <TextField label="Longitude" inputMode="decimal" {...form.bind("longitude")} />
          </div>
        </Panel>
        <Panel title="Operating hours" description="Times are shown to patients as reported by your facility.">
          <div className="grid gap-3">
            {DAYS.map(([k, label]) => {
              const h = hours[k] ?? { open: "09:00", close: "17:00", closed: false };
              const patch = (next: Partial<typeof h>) => { setHoursTouched(true); setHours((cur) => ({ ...cur, [k]: { ...h, ...next } })); };
              return (
                <div key={k} className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_1fr_auto]">
                  <span className="flex items-center gap-2 text-sm font-medium"><Clock className="size-4 text-muted-foreground" aria-hidden="true" />{label}</span>
                  <TextField label={`${label} opens`} type="time" value={h.open} onChange={(v) => patch({ open: v })} disabled={h.closed} />
                  <TextField label={`${label} closes`} type="time" value={h.close} onChange={(v) => patch({ close: v })} disabled={h.closed} />
                  <CheckField label="Closed" checked={h.closed} onChange={(c) => patch({ closed: c })} />
                </div>
              );
            })}
          </div>
          {hoursError ? <p role="alert" className="mt-3 text-sm font-medium text-danger">{hoursError}</p> : null}
        </Panel>
        <div><Button type="submit" size="lg" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button></div>
      </form>
    </>
  );
}
