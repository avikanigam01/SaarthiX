import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { assertOk, unwrap } from "./_shared";

export type ProfileUpdate = Partial<Pick<Profile,
  "full_name" | "phone" | "date_of_birth" | "gender" | "address" | "district" | "state" |
  "preferred_language" | "emergency_contact_name" | "emergency_contact_phone">>;

export async function getProfile(userId: string): Promise<Profile | null> {
  const res = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return unwrap<Profile | null>(res, "Unable to load your profile.");
}

/** Only the whitelisted personal fields can be sent — never roles or is_active. */
export async function updateProfile(userId: string, input: ProfileUpdate): Promise<Profile> {
  const res = await supabase.from("profiles").update(input).eq("id", userId).select("*").single();
  return unwrap<Profile>(res, "Unable to save your profile. Please try again.");
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const { ServiceError } = await import("@/lib/errors");
    throw new ServiceError("We couldn't update your password. Choose a stronger password (at least 8 characters) and try again.");
  }
}

export { assertOk };
