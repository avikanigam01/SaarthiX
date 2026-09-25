import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/types/database";
import { assertOk, unwrapList, PAGE_SIZE } from "./_shared";

export async function listNotifications(userId: string, page = 0, unreadOnly = false): Promise<{ rows: AppNotification[]; hasMore: boolean }> {
  let query = supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (unreadOnly) query = query.eq("is_read", false);
  const rows = unwrapList<AppNotification>(await query, "Unable to load notifications.");
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
  assertOk(error, "Unable to load notifications.");
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  assertOk(error, "Unable to update this notification.");
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  assertOk(error, "Unable to update notifications.");
}
