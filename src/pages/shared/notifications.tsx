import { useQuery } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Pager } from "@/components/data/controls";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useCurrentUser } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/format";
import type { PortalKind } from "@/lib/roles";
import { listNotifications, markAllRead, markRead } from "@/services/notifications";
import type { AppNotification } from "@/types/database";

function targetFor(kind: PortalKind, n: AppNotification): string | null {
  if (!n.related_entity_id) return null;
  switch (n.related_entity_type) {
    case "referral": return `/${kind}/referrals/${n.related_entity_id}`;
    case "visit": return kind === "patient" || kind === "hospital" ? `/${kind}/visits` : null;
    case "followup": return kind === "patient" ? `/patient/followups/${n.related_entity_id}` : kind === "hospital" ? "/hospital/followups" : null;
    case "journey": return kind === "patient" ? `/patient/journey/${n.related_entity_id}` : null;
    default: return null;
  }
}

export function NotificationsPage({ kind }: { kind: PortalKind }) {
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useQuery({ queryKey: ["notifications", userId, page, unreadOnly], queryFn: () => listNotifications(userId, page, unreadOnly), placeholderData: (p) => p });
  useRealtimeInvalidate("notifications", [["notifications", userId], ["unread-count", userId]], { filter: `user_id=eq.${userId}` });

  const read = useAction(markRead, { invalidate: [["notifications", userId], ["unread-count", userId]], silentError: true });
  const readAll = useAction(() => markAllRead(userId), { success: "All notifications marked as read.", invalidate: [["notifications", userId], ["unread-count", userId]] });

  const open = (n: AppNotification) => {
    if (!n.is_read) read.mutate(n.id);
    const to = targetFor(kind, n);
    if (to) void navigate({ to: to as "/" });
  };

  return (
    <>
      <PageHeader eyebrow="Notifications" title="Updates" description="Important updates about your visits, referrals and follow-ups." actions={<><Button variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => { setPage(0); setUnreadOnly((v) => !v); }}>{unreadOnly ? "Showing unread" : "Unread only"}</Button><Button variant="outline" size="sm" onClick={() => readAll.mutate(undefined)} disabled={readAll.isPending}><CheckCheck aria-hidden="true" /> Mark all read</Button></>} />
      <QueryBoundary query={query} emptyTitle={unreadOnly ? "No unread notifications." : "No notifications yet."} emptyDescription="Updates will appear here as things happen." isEmpty={(d) => d.rows.length === 0}>
        {(d) => (
          <>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {d.rows.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${n.is_read ? "" : "bg-brand-soft/40"}`}>
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-brand"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{n.title}{n.is_read ? "" : <span className="sr-only"> (unread)</span>}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pager page={page} hasMore={d.hasMore} onPage={setPage} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
