import { useQuery } from "@tanstack/react-query";
import { Check, CirclePause, CirclePlay, Play, SkipForward, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { usePatientDirectory } from "@/hooks/use-patient-directory";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useFacility } from "@/lib/facility-context";
import { formatDateTime } from "@/lib/format";
import { listActiveDepartments } from "@/services/departments";
import { callNext, completeQueueVisit, getQueuePaused, listQueue, setQueuePaused, skipQueueVisit, startQueueVisit, type QueueVisit } from "@/services/queue";

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function QueueBoard() {
  const facility = useFacility();
  const [departmentId, setDepartmentId] = useState("all");
  const queueDate = todayLocal();
  const directory = usePatientDirectory(facility.id);
  const departments = useQuery({ queryKey: ["hospital", facility.id, "departments-active"], queryFn: () => listActiveDepartments(facility.id) });
  const selectedDepartment = departmentId === "all" ? undefined : departmentId;
  const queueKey = ["queue", facility.id, queueDate, departmentId] as const;
  const queue = useQuery({ queryKey: queueKey, queryFn: () => listQueue(facility.id, queueDate, selectedDepartment), refetchInterval: 30000 });
  const paused = useQuery({ queryKey: ["queue-paused", facility.id, departmentId], queryFn: () => getQueuePaused(facility.id, selectedDepartment ?? null), enabled: departmentId !== "all" });
  useRealtimeInvalidate("visits", [["queue", facility.id]]);
  useRealtimeInvalidate("visits", [["visits"]]);

  const invalidate = [["queue", facility.id], ["queue-paused", facility.id], ["visits"]];
  const call = useAction(() => callNext(facility.id, selectedDepartment ?? null, queueDate), { success: "Next patient called.", invalidate });
  const start = useAction((id: string) => startQueueVisit(id), { success: "Consultation started.", invalidate });
  const complete = useAction((id: string) => completeQueueVisit(id), { success: "Visit completed.", invalidate });
  const skip = useAction((id: string) => skipQueueVisit(id), { success: "Queue entry updated.", invalidate });
  const pause = useAction((value: boolean) => setQueuePaused(facility.id, selectedDepartment ?? null, value), { success: (value) => value ? "Queue paused." : "Queue resumed.", invalidate });

  const rows = queue.data ?? [];
  const activeCount = useMemo(() => rows.filter((v) => ["waiting", "called", "in_progress", "skipped"].includes(v.queue_status)).length, [rows]);
  const current = rows.find((v) => v.queue_status === "in_progress") ?? rows.find((v) => v.queue_status === "called");

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Live queue" title="Queue board" description="Live tokens for visits recorded at your facility. Waiting times are estimates, not guarantees." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Active queue"><p className="text-3xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Waiting, called or in consultation</p></Panel>
        <Panel title="Now serving"><p className="text-3xl font-bold">{current?.token_number ? `#${current.token_number}` : "—"}</p><p className="truncate text-xs text-muted-foreground">{current ? directory.nameOf(current.patient_id) : "No active consultation"}</p></Panel>
        <Panel title="Queue status" actions={<Button size="sm" variant="outline" disabled={departmentId === "all" || pause.isPending} onClick={() => pause.mutate(!paused.data)}>{paused.data ? <><CirclePlay className="mr-1 size-4" /> Resume</> : <><CirclePause className="mr-1 size-4" /> Pause</>}</Button>}><p className="text-sm font-semibold">{paused.data ? "Paused" : "Open"}</p><p className="text-xs text-muted-foreground">New visits are not accepted while paused.</p></Panel>
      </div>
      <Panel title="Filter queue" description="Choose a department to see its tokens. ‘All departments’ shows the facility-wide list.">
        <div className="max-w-sm">
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger aria-label="Filter by department"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All departments</SelectItem>{(departments.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Panel>
      <QueryBoundary query={queue} emptyTitle="No queue entries today." emptyDescription="Queue tokens appear when staff schedule real visits. No sample patients are inserted.">
        {(data) => <Panel title="Today's tokens" description={`${data.length} active queue entr${data.length === 1 ? "y" : "ies"}`}>
          <div className="space-y-3">
            {data.map((visit: QueueVisit) => <div key={visit.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg font-bold text-brand">{visit.token_number ? `#${visit.token_number}` : "—"}</div>
                <div className="min-w-0"><p className="truncate font-semibold">{directory.nameOf(visit.patient_id)}</p><p className="text-xs text-muted-foreground">{visit.department?.name ?? "General queue"} · {formatDateTime(visit.visit_date)}</p><p className="mt-1 text-xs text-muted-foreground">Approx. start: {visit.estimated_start_at ? formatDateTime(visit.estimated_start_at) : "Not calculated"}</p><div className="mt-2"><StatusPill status={visit.queue_status} /></div></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {visit.queue_status === "waiting" || visit.queue_status === "skipped" ? <Button size="sm" variant="outline" disabled={departmentId === "all" || call.isPending} onClick={() => call.mutate()}><Users className="mr-1 size-4" /> Call next</Button> : null}
                {visit.queue_status === "called" ? <Button size="sm" disabled={start.isPending} onClick={() => start.mutate(visit.id)}><Play className="mr-1 size-4" /> Start</Button> : null}
                {visit.queue_status === "in_progress" ? <Button size="sm" disabled={complete.isPending} onClick={() => complete.mutate(visit.id)}><Check className="mr-1 size-4" /> Complete</Button> : null}
                {visit.queue_status === "waiting" || visit.queue_status === "called" ? <Button size="sm" variant="outline" disabled={skip.isPending} onClick={() => skip.mutate(visit.id)}><SkipForward className="mr-1 size-4" /> Skip</Button> : null}
              </div>
            </div>)}
          </div>
        </Panel>}
      </QueryBoundary>
    </div>
  );
}
