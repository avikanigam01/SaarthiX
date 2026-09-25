import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { Pager, SearchBox, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { useDebounced } from "@/hooks/use-debounced";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { searchUsers } from "@/services/admin";
import type { UserWithRoles } from "@/types/database";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const term = useDebounced(search);
  const query = useQuery({ queryKey: ["admin", "users", term, page], queryFn: () => searchUsers(term, page), placeholderData: (p) => p });

  const columns: Column<UserWithRoles>[] = [
    { key: "name", header: "Name", primary: true, cell: (u) => <span className="font-medium">{u.full_name}</span> },
    { key: "email", header: "Email", cell: (u) => u.email ?? "—" },
    { key: "roles", header: "Roles", cell: (u) => u.roles.length ? <span className="flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs">{ROLE_LABELS[r]}</span>)}</span> : "—" },
    { key: "status", header: "Status", cell: (u) => <StatusPill status={u.is_active ? "active" : "inactive"} /> },
    { key: "joined", header: "Joined", cell: (u) => formatDate(u.created_at) },
    { key: "actions", header: "", cell: (u) => <AppLink to={`/admin/users/${u.id}`} className="text-sm font-medium text-brand hover:underline">Manage</AppLink> },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Users" description="Accounts, roles and facility access. Role changes are audit-logged." />
      <Toolbar><SearchBox value={search} onChange={(v) => { setPage(0); setSearch(v); }} placeholder="Search name, email or phone" label="Search users" /></Toolbar>
      <QueryBoundary query={query} emptyTitle="No users found." isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(u) => u.id} caption="Users" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>
    </>
  );
}
