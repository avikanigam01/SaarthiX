import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

/**
 * Subscribes to Postgres changes on one table and invalidates the given query keys.
 * Row Level Security still applies to realtime events, so a user only ever receives
 * changes for rows they are allowed to read.
 */
export function useRealtimeInvalidate(
  table: string,
  queryKeys: QueryKey[],
  options: { filter?: string; enabled?: boolean } = {},
): void {
  const queryClient = useQueryClient();
  const { filter, enabled = true } = options;
  const keySignature = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!enabled) return;
    const keys = JSON.parse(keySignature) as QueryKey[];
    const channelName = `rt:${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => {
          for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter, enabled, keySignature, queryClient]);
}
