import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { FormDialog } from "@/components/data/dialogs";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { useFacility } from "@/lib/facility-context";
import { formatDateTime, isStale, relativeTime, STALE_AFTER_DAYS } from "@/lib/format";
import { createDepartment, listDepartments, updateDepartment } from "@/services/departments";
import { diagnosticServices, facilityServices } from "@/services/catalog";
import { getDisplayNames } from "@/services/staff-names";
import type { AvailabilityStatus } from "@/types/database";

type Item = {
  id: string; name: string; description: string | null; status: AvailabilityStatus; is_active: boolean;
  updated_at: string; last_verified_at?: string | null; last_verified_by?: string | null; updated_by?: string | null;
};
type Adapter = {
  list: (facilityId: string) => Promise<Item[]>;
  create: (facilityId: string, input: { name: string; description: string | null; status: AvailabilityStatus }) => Promise<unknown>;
  update: (id: string, input: { name?: string; description?: string | null; status?: AvailabilityStatus; is_active?: boolean }) => Promise<unknown>;
  reverify?: (id: string) => Promise<unknown>;
};

const ADAPTERS: Record<"departments" | "services" | "diagnostics", Adapter> = {
  departments: { list: listDepartments as Adapter["list"], create: createDepartment, update: updateDepartment },
  services: { list: facilityServices.list as Adapter["list"], create: facilityServices.create, update: facilityServices.update, reverify: facilityServices.reverify },
  diagnostics: { list: diagnosticServices.list as Adapter["list"], create: diagnosticServices.create, update: diagnosticServices.update, reverify: diagnosticServices.reverify },
};

const STATUS_OPTIONS = [{ value: "available", label: "Available" }, { value: "limited", label: "Limited" }, { value: "unavailable", label: "Unavailable" }];
const schema = z.object({ name: z.string().trim().min(2, "Enter a name.").max(120), description: z.string().trim().max(500), status: z.enum(["available", "limited", "unavailable"]) });

export function CatalogManagerPage({ resource, title, noun, description }: { resource: keyof typeof ADAPTERS; title: string; noun: string; description: string }) {
  const facility = useFacility();
  const api = ADAPTERS[resource];
  const key = ["hospital", facility.id, resource];
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const form = useZodForm(schema, { name: "", description: "", status: "available" as AvailabilityStatus });

  const query = useQuery({ queryKey: key, queryFn: () => api.list(facility.id) });
  const names = useQuery({ queryKey: [...key, "names", query.data?.length], queryFn: () => getDisplayNames((query.data ?? []).map((i) => i.last_verified_by ?? i.updated_by)), enabled: Boolean(query.data?.length) });
  // facility_services / diagnostic_services are published to Realtime (departments are not).
  useRealtimeInvalidate(resource === "services" ? "facility_services" : "diagnostic_services", [key], { filter: `facility_id=eq.${facility.id}`, enabled: resource !== "departments" });

  const save = useAction(
    async (v: { name: string; description: string | null; status: AvailabilityStatus }) => (editing && editing !== "new" ? api.update(editing.id, v) : api.create(facility.id, v)),
    { success: `${noun} saved.`, invalidate: [key], onSuccess: () => setEditing(null) },
  );
  const setStatus = useAction(({ id, status }: { id: string; status: AvailabilityStatus }) => api.update(id, { status }), { success: "Availability updated.", invalidate: [key] });
  const toggleActive = useAction(({ id, active }: { id: string; active: boolean }) => api.update(id, { is_active: active }), { success: "Updated.", invalidate: [key] });
  const reverify = useAction((id: string) => (api.reverify ? api.reverify(id) : Promise.resolve()), { success: "Marked as confirmed today.", invalidate: [key] });

  const open = (item: Item | "new") => {
    form.reset(item === "new" ? { name: "", description: "", status: "available" } : { name: item.name, description: item.description ?? "", status: item.status });
    setEditing(item);
  };
  const submit = () => {
    const v = form.validate();
    if (v) save.mutate({ name: v.name, description: emptyToNull(v.description), status: v.status });
  };

  return (
    <>
      <PageHeader eyebrow={facility.name} title={title} description={description} actions={<Button onClick={() => open("new")}><Plus aria-hidden="true" /> Add {noun.toLowerCase()}</Button>} />
      <QueryBoundary query={query} emptyTitle={`No ${title.toLowerCase()} added yet.`} emptyDescription={`Add the ${title.toLowerCase()} your facility offers so patients can find you.`} emptyAction={<Button onClick={() => open("new")}>Add {noun.toLowerCase()}</Button>}>
        {(rows) => (
          <ul className="grid gap-3">
            {rows.map((item) => {
              const stamp = item.last_verified_at ?? item.updated_at;
              const stale = resource !== "departments" ? isStale(item.last_verified_at) : isStale(item.updated_at);
              const by = names.data?.get((item.last_verified_by ?? item.updated_by) ?? "");
              return (
                <li key={item.id} className={`rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${item.is_active ? "border-border" : "border-dashed border-border opacity-70"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.name}</h2><StatusPill status={item.status} />{!item.is_active ? <StatusPill status="inactive" /> : null}</div>
                      {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                      <p className={`mt-2 text-xs ${stale ? "font-medium text-warning-foreground" : "text-muted-foreground"}`} title={formatDateTime(stamp)}>
                        {resource !== "departments" && !item.last_verified_at ? "Never confirmed" : `Updated ${relativeTime(stamp)}${by ? ` by ${by}` : ""}`}
                        {stale ? ` · not confirmed in ${STALE_AFTER_DAYS}+ days` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`status-${item.id}`}>Availability for {item.name}</label>
                      <select id={`status-${item.id}`} value={item.status} disabled={setStatus.isPending} onChange={(e) => setStatus.mutate({ id: item.id, status: e.target.value as AvailabilityStatus })} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      {api.reverify ? <Button size="sm" variant={stale ? "default" : "outline"} onClick={() => reverify.mutate(item.id)} disabled={reverify.isPending}><CheckCircle2 aria-hidden="true" /> Still accurate</Button> : null}
                      <Button size="sm" variant="ghost" onClick={() => open(item)} aria-label={`Edit ${item.name}`}><Pencil aria-hidden="true" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive.mutate({ id: item.id, active: !item.is_active })}>{item.is_active ? "Hide" : "Show"}</Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </QueryBoundary>

      <FormDialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }} title={editing === "new" ? `Add ${noun.toLowerCase()}` : `Edit ${noun.toLowerCase()}`} onSubmit={submit} pending={save.isPending}>
        <TextField label="Name" required {...form.bind("name")} />
        <TextAreaField label="Description (optional)" rows={3} maxLength={500} {...form.bind("description")} />
        <SelectField label="Current availability" options={STATUS_OPTIONS} {...form.bind("status")} />
      </FormDialog>
    </>
  );
}
