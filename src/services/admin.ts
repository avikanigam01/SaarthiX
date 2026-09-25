import { supabase } from "@/lib/supabase";
import { likePattern } from "@/lib/format";
import type { AuditLog, Profile, UserRole, UserRoleRow, UserWithRoles } from "@/types/database";
import { unwrap, unwrapList, PAGE_SIZE } from "./_shared";

export async function searchUsers(search: string, page = 0): Promise<{ rows: UserWithRoles[]; hasMore: boolean }> {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const term = search.trim();
  if (term) {
    const p = likePattern(term);
    query = query.or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`);
  }
  const profiles = unwrapList<Profile>(await query, "Unable to load users.");
  const pageRows = profiles.slice(0, PAGE_SIZE);
  const roles = await rolesFor(pageRows.map((p) => p.id));
  return {
    rows: pageRows.map((p) => ({ ...p, roles: roles.get(p.id) ?? [] })),
    hasMore: profiles.length > PAGE_SIZE,
  };
}

async function rolesFor(ids: string[]): Promise<Map<string, UserRole[]>> {
  const map = new Map<string, UserRole[]>();
  if (ids.length === 0) return map;
  const res = await supabase.from("user_roles").select("user_id,role").in("user_id", ids);
  for (const r of unwrapList<Pick<UserRoleRow, "user_id" | "role">>(res, "Unable to load roles.")) {
    map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]);
  }
  return map;
}

export async function getUser(id: string): Promise<UserWithRoles | null> {
  const res = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const profile = unwrap<Profile | null>(res, "Unable to load this user.");
  if (!profile) return null;
  const roles = await rolesFor([id]);
  return { ...profile, roles: roles.get(id) ?? [] };
}

export async function findUserByEmail(email: string): Promise<Pick<Profile, "id" | "full_name" | "email"> | null> {
  const res = await supabase.from("profiles").select("id,full_name,email").ilike("email", likePattern(email).slice(1, -1)).limit(1).maybeSingle();
  return unwrap<Pick<Profile, "id" | "full_name" | "email"> | null>(res, "Unable to look up this user.");
}

/** Authorization is enforced by the database trigger public.guard_role_change(); this only sends the request. */
export async function addRole(userId: string, role: UserRole): Promise<void> {
  const res = await supabase.from("user_roles").insert({ user_id: userId, role });
  unwrap<unknown>(res, "Unable to assign this role.");
}

export async function removeRole(userId: string, role: UserRole): Promise<void> {
  const res = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  unwrap<unknown>(res, "Unable to remove this role.");
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  const res = await supabase.from("profiles").update({ is_active: active }).eq("id", userId).select("id").single();
  unwrap<unknown>(res, "Unable to change this account.");
}

export type UserFacilityLink = { id: string; facility_id: string; designation: string | null; is_active: boolean; facility: { id: string; name: string } | null };

export async function listUserFacilities(userId: string): Promise<UserFacilityLink[]> {
  const res = await supabase.from("facility_staff").select("id,facility_id,designation,is_active,facility:facilities!facility_id(id,name)").eq("user_id", userId);
  return unwrapList<UserFacilityLink>(res, "Unable to load facility links.");
}

export type AuditFilters = { entityType?: string; action?: string; page?: number };

export async function listAuditLogs(filters: AuditFilters): Promise<{ rows: AuditLog[]; hasMore: boolean }> {
  const page = filters.page ?? 0;
  let query = supabase
    .from("audit_logs")
    .select("id,actor_user_id,action,entity_type,entity_id,old_data,new_data,created_at,actor:profiles!actor_user_id(full_name)")
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.action) query = query.eq("action", filters.action);
  const rows = unwrapList<AuditLog>(await query, "Unable to load the audit log.");
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function listAuditEntityTypes(): Promise<string[]> {
  // Static list of audited tables (see migration 20260918001100_audit_logs).
  return [
    "facilities", "facility_staff", "user_roles", "departments", "facility_services",
    "diagnostic_services", "doctors", "medicine_inventory", "referrals", "visits",
  ];
}
