import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { FilterSelect, Pager, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, labelize } from "@/lib/format";
import { listAuditEntityTypes, listAuditLogs } from "@/services/admin";
import type { AuditLog } from "@/types/database";

export default function AdminAuditLogsPage() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const types = useQuery({ queryKey: ["admin", "audit-types"], queryFn: listAuditEntityTypes });
  const query = useQuery({ queryKey: ["admin", "audit", entity, page], queryFn: () => listAuditLogs({ ...(entity ? { entityType: entity } : {}), page }), placeholderData: (p) => p });

  const columns: Column<AuditLog>[] = [
    { key: "when", header: "When", primary: true, cell: (l) => formatDateTime(l.created_at) },
    { key: "actor", header: "Who", cell: (l) => l.actor?.full_name ?? (l.actor_user_id ? "Unknown user" : "System") },
    { key: "action", header: "Action", cell: (l) => labelize(l.action) },
    { key: "entity", header: "Record", cell: (l) => labelize(l.entity_type) },
    { key: "actions", header: "", cell: (l) => <Button size="sm" variant="ghost" onClick={() => setSelected(l)}>Details</Button> },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit log" description="A tamper-resistant record of sensitive changes. Entries can't be edited or deleted." />
      <Toolbar><FilterSelect label="Record type" value={entity} onChange={(v) => { setPage(0); setEntity(v); }} options={[{ value: "", label: "All record types" }, ...(types.data ?? []).map((t) => ({ value: t, label: labelize(t) }))]} /></Toolbar>
      <QueryBoundary query={query} emptyTitle="No audit entries yet." emptyDescription="Entries appear as sensitive changes are made." isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(l) => l.id} caption="Audit log" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>
      <Dialog open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{selected ? `${labelize(selected.action)} — ${labelize(selected.entity_type)}` : ""}</DialogTitle><DialogDescription>{selected ? formatDateTime(selected.created_at) : ""}</DialogDescription></DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div><p className="text-xs font-semibold uppercase text-muted-foreground">Before</p><pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">{selected.old_data ? JSON.stringify(selected.old_data, null, 2) : "—"}</pre></div>
              <div><p className="text-xs font-semibold uppercase text-muted-foreground">After</p><pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-muted p-3 text-xs">{selected.new_data ? JSON.stringify(selected.new_data, null, 2) : "—"}</pre></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
