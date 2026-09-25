import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppLink } from "@/components/data/app-link";
import { FilterSelect, Pager, SearchBox, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { FormDialog } from "@/components/data/dialogs";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useDebounced } from "@/hooks/use-debounced";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { formatDate } from "@/lib/format";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/validation";
import { adminListFacilities, createFacility, type AdminFacilityFilters } from "@/services/facilities";
import type { Facility } from "@/types/database";

export const facilityState = (f: Facility) => (!f.is_active ? "suspended" : f.is_verified ? "verified" : "unverified");

const schema = z.object({
  name: z.string().trim().min(2, "Enter the facility name.").max(160),
  facility_type: z.string().trim().min(2, "Enter the facility type.").max(80),
  address: z.string().trim().min(3, "Enter the address.").max(300),
  district: z.string().trim().min(2, "Enter the district.").max(80),
  state: z.string().trim().min(2, "Enter the state.").max(80),
  registration_number: z.string().trim().max(80),
  phone: z.string().trim().refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number."),
  email: z.string().trim().refine((v) => v === "" || EMAIL_PATTERN.test(v), "Enter a valid email address."),
});

export default function AdminFacilitiesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<NonNullable<AdminFacilityFilters["status"]>>("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const term = useDebounced(search);
  const query = useQuery({ queryKey: ["admin", "facilities", term, status, page], queryFn: () => adminListFacilities({ search: term, status, page }), placeholderData: (p) => p });
  const form = useZodForm(schema, { name: "", facility_type: "", address: "", district: "", state: "", registration_number: "", phone: "", email: "" });
  const create = useAction(createFacility, { success: "Facility created. Verify it to make it visible to patients.", invalidate: [["admin", "facilities"]], onSuccess: () => { setOpen(false); form.reset(); } });

  const submit = () => {
    const v = form.validate();
    if (v) create.mutate({ name: v.name, facility_type: v.facility_type, address: v.address, district: v.district, state: v.state, registration_number: emptyToNull(v.registration_number), phone: emptyToNull(v.phone), email: emptyToNull(v.email) });
  };

  const columns: Column<Facility>[] = [
    { key: "name", header: "Facility", primary: true, cell: (f) => <span className="font-medium">{f.name}</span> },
    { key: "type", header: "Type", cell: (f) => f.facility_type },
    { key: "area", header: "District / state", cell: (f) => `${f.district}, ${f.state}` },
    { key: "status", header: "Status", cell: (f) => <StatusPill status={facilityState(f)} /> },
    { key: "created", header: "Added", cell: (f) => formatDate(f.created_at) },
    { key: "actions", header: "", cell: (f) => <AppLink to={`/admin/facilities/${f.id}`} className="text-sm font-medium text-brand hover:underline">Manage</AppLink> },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Facilities" description="Create facilities, verify them, and manage who can administer each one." actions={<Button onClick={() => setOpen(true)}><Plus aria-hidden="true" /> Add facility</Button>} />
      <Toolbar>
        <SearchBox value={search} onChange={(v) => { setPage(0); setSearch(v); }} placeholder="Search name, district or state" label="Search facilities" />
        <FilterSelect label="Status" value={status} onChange={(v) => { setPage(0); setStatus(v as typeof status); }} options={[{ value: "all", label: "All facilities" }, { value: "unverified", label: "Awaiting verification" }, { value: "verified", label: "Verified" }, { value: "suspended", label: "Suspended" }]} />
      </Toolbar>
      <QueryBoundary query={query} emptyTitle="No facilities found." emptyDescription="Add the first facility to get started." isEmpty={(d) => d.rows.length === 0} emptyAction={<Button onClick={() => setOpen(true)}>Add facility</Button>}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(f) => f.id} caption="Facilities" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>
      <FormDialog open={open} onOpenChange={setOpen} title="Add a facility" description="New facilities are unverified and hidden from patients until you verify them." onSubmit={submit} pending={create.isPending} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Facility name" required {...form.bind("name")} />
          <TextField label="Facility type" required placeholder="e.g. District Hospital" {...form.bind("facility_type")} />
          <TextField className="sm:col-span-2" label="Address" required {...form.bind("address")} />
          <TextField label="District" required {...form.bind("district")} />
          <TextField label="State" required {...form.bind("state")} />
          <TextField label="Registration number" {...form.bind("registration_number")} />
          <TextField label="Phone" type="tel" {...form.bind("phone")} />
          <TextField label="Email" type="email" {...form.bind("email")} />
        </div>
      </FormDialog>
    </>
  );
}
