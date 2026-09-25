import { supabase } from "@/lib/supabase";
import { unwrapList } from "./_shared";

/** Resolves "updated by" ids to names for colleagues at shared facilities (minimum-necessary). */
export async function getDisplayNames(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const res = await supabase.rpc("get_user_display_names", { _ids: unique });
  const rows = unwrapList<{ id: string; full_name: string }>(res, "Unable to load names.");
  return new Map(rows.map((r) => [r.id, r.full_name]));
}
