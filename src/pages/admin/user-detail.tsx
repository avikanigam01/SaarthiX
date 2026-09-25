import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { ConfirmDialog, FormDialog } from "@/components/data/dialogs";
import { InfoGrid, PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField } from "@/components/forms/fields";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { addRole, getUser, listUserFacilities, removeRole, setUserActive } from "@/services/admin";
import { addFacilityStaff, listFacilityOptions } from "@/services/facilities";
import type { UserRole } from "@/types/database";

const ASSIGNABLE: UserRole[] = ["hospital_staff", "hospital_admin", "referral_coordinator", "government_admin", "super_admin", "patient"];

export default function AdminUserDetailPage() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const { user: me, roles: myRoles } = useAuth();
  const user = useQuery({ queryKey: ["admin", "user", id], queryFn: () => getUser(id), enabled: Boolean(id) });
  const links = useQuery({ queryKey: ["admin", "user", id, "facilities"], queryFn: () => listUserFacilities(id), enabled: Boolean(id) });
  const [role, setRole] = useState<UserRole | "">("");
  const [removing, setRemoving] = useState<UserRole | null>(null);
  const [toggle, setToggle] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const facilities = useQuery({ queryKey: ["admin", "facility-options"], queryFn: listFacilityOptions, enabled: linkOpen });

  const refresh = [["admin", "user", id], ["admin", "users"]];
  const grant = useAction((r: UserRole) => addRole(id, r), { success: "Role assigned.", invalidate: refresh, onSuccess: () => setRole("") });
  const revoke = useAction((r: UserRole) => removeRole(id, r), { success: "Role removed.", invalidate: refresh, onSuccess: () => setRemoving(null) });
  const active = useAction((v: boolean) => setUserActive(id, v), { success: "Account updated.", invalidate: refresh, onSuccess: () => setToggle(false) });
  const link = useAction(() => addFacilityStaff({ facilityId, userId: id, designation: null }), { success: "Linked to facility.", invalidate: [["admin", "user", id, "facilities"]], onSuccess: () => { setLinkOpen(false); setFacilityId(""); } });

  if (user.isLoading) return <LoadingState label="Loading user..." />;
  if (user.isError) return <ErrorState onRetry={() => void user.refetch()} />;
  const u = user.data;
  if (!u) return <EmptyState title="User not found." action={<AppLink to="/admin/users" className="text-sm font-medium text-brand hover:underline">Back to users</AppLink>} />;
  const isSelf = me?.id === u.id;
  const iAmSuper = myRoles.includes("super_admin");

  return (
    <>
      <AppLink to="/admin/users" className="mb-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">← All users</AppLink>
      <PageHeader eyebrow="User" title={u.full_name} description={u.email ?? undefined} actions={<StatusPill status={u.is_active ? "active" : "inactive"} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Account">
          <InfoGrid items={[{ label: "Phone", value: u.phone ?? "—" }, { label: "District", value: u.district ?? "—" }, { label: "State", value: u.state ?? "—" }, { label: "Joined", value: formatDate(u.created_at) }]} />
          <div className="mt-5">
            {isSelf ? <p className="text-xs text-muted-foreground">You can't change your own account status.</p> : <Button variant={u.is_active ? "outline" : "default"} onClick={() => setToggle(true)}>{u.is_active ? "Deactivate account" : "Reactivate account"}</Button>}
          </div>
        </Panel>

        <Panel title="Roles" description="Roles control what this person can access. Only super administrators can grant administrator roles.">
          <ul className="divide-y divide-border">
            {u.roles.map((r) => (
              <li key={r} className="flex items-center justify-between gap-3 py-2.5"><span className="text-sm font-medium">{ROLE_LABELS[r]}</span>{!(isSelf && r === "super_admin") ? <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>Remove</Button> : null}</li>
            ))}
            {u.roles.length === 0 ? <li className="py-2.5 text-sm text-muted-foreground">No roles assigned.</li> : null}
          </ul>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1"><SelectField label="Add a role" value={role} onChange={(v) => setRole(v as UserRole | "")} placeholder="Select a role" options={ASSIGNABLE.filter((r) => !u.roles.includes(r) && (iAmSuper || (r !== "super_admin" && r !== "government_admin"))).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} /></div>
            <Button disabled={!role || grant.isPending || isSelf} onClick={() => role && grant.mutate(role)}>Assign</Button>
          </div>
          {isSelf ? <p className="mt-2 text-xs text-muted-foreground">You can't assign roles to your own account.</p> : null}
        </Panel>

        <Panel className="lg:col-span-2" title="Facility access" actions={<Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>Link to facility</Button>}>
          <QueryBoundary query={links} emptyTitle="Not linked to any facility." emptyDescription="Hospital staff need a facility link as well as a hospital role.">
            {(rows) => <ul className="divide-y divide-border">{rows.map((l) => <li key={l.id} className="flex items-center justify-between gap-3 py-2.5"><AppLink to={`/admin/facilities/${l.facility_id}`} className="text-sm font-medium text-brand hover:underline">{l.facility?.name ?? "Facility"}</AppLink><StatusPill status={l.is_active ? "active" : "inactive"} /></li>)}</ul>}
          </QueryBoundary>
        </Panel>
      </div>

      <ConfirmDialog open={removing !== null} onOpenChange={(o) => { if (!o) setRemoving(null); }} title="Remove this role?" description={`${u.full_name} will lose the ${removing ? ROLE_LABELS[removing] : ""} permissions immediately.`} confirmLabel="Remove role" destructive pending={revoke.isPending} onConfirm={() => removing && revoke.mutate(removing)} />
      <ConfirmDialog open={toggle} onOpenChange={setToggle} title={u.is_active ? "Deactivate this account?" : "Reactivate this account?"} description={u.is_active ? "They will be unable to use any role-based feature until reactivated." : "The account regains its roles and access."} confirmLabel={u.is_active ? "Deactivate" : "Reactivate"} destructive={u.is_active} pending={active.isPending} onConfirm={() => active.mutate(!u.is_active)} />
      <FormDialog open={linkOpen} onOpenChange={setLinkOpen} title="Link to a facility" onSubmit={() => { if (facilityId) link.mutate(undefined); }} submitLabel="Link" pending={link.isPending}>
        <SelectField label="Facility" required value={facilityId} onChange={setFacilityId} placeholder={facilities.isLoading ? "Loading…" : "Select a facility"} options={(facilities.data ?? []).map((f) => ({ value: f.id, label: `${f.name} — ${f.district}` }))} />
      </FormDialog>
    </>
  );
}
