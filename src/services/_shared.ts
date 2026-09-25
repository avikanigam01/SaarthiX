import type { PostgrestError } from "@supabase/supabase-js";

import { devLog, ServiceError, toUserMessage } from "@/lib/errors";

type Result = { data: unknown; error: PostgrestError | null };

/** Throws a ServiceError with a human message when the call failed; otherwise returns typed data. */
export function unwrap<T>(res: Result, fallback: string): T {
  if (res.error) {
    devLog("service", res.error);
    throw new ServiceError(toUserMessage(res.error, fallback), res.error.code);
  }
  return res.data as T;
}

export function unwrapList<T>(res: Result, fallback: string): T[] {
  if (res.error) {
    devLog("service", res.error);
    throw new ServiceError(toUserMessage(res.error, fallback), res.error.code);
  }
  return ((res.data ?? []) as T[]);
}

export function assertOk(error: PostgrestError | null, fallback: string): void {
  if (error) {
    devLog("service", error);
    throw new ServiceError(toUserMessage(error, fallback), error.code);
  }
}

export const PAGE_SIZE = 20;

/** RPC that returns a single composite row comes back as an object (or an array with one row). */
export function firstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return (data as T | null) ?? null;
}
