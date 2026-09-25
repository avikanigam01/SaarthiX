import { supabase } from "@/lib/supabase";
import type { AuthError } from "@supabase/supabase-js";

export type AuthResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/**
 * §44 — never expose raw database/auth errors to users. Every known
 * Supabase Auth error code is mapped to a short, human sentence; the
 * fallback is generic on purpose so unmapped provider errors never
 * leak internal detail.
 */
function toHumanMessage(error: AuthError | { message?: string } | null): string {
  const code = (error as AuthError | null)?.code;
  const raw = error?.message?.toLowerCase() ?? "";

  if (code === "user_already_exists" || raw.includes("already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (code === "invalid_credentials" || raw.includes("invalid login credentials")) {
    return "That email or password isn't correct.";
  }
  if (code === "email_not_confirmed" || raw.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (code === "weak_password" || raw.includes("password")) {
    return "Please choose a stronger password (at least 8 characters).";
  }
  if (raw.includes("rate limit") || code === "over_email_send_rate_limit") {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (raw.includes("network") || raw.includes("fetch")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

export async function registerPatient(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AuthResult<{ emailConfirmationRequired: boolean }>> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      ...(typeof window !== "undefined" ? { emailRedirectTo: `${window.location.origin}/login` } : {}),
      // Read by the public.handle_new_user() database trigger to seed
      // profiles.full_name. The client never writes user_roles itself —
      // the trigger grants exactly one role: 'patient' (§3, §49).
      data: {
        full_name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
      },
    },
  });

  if (error) {
    return { ok: false, message: toHumanMessage(error) };
  }

  // If email confirmation is enabled on the project, Supabase returns a
  // user with no active session yet.
  const emailConfirmationRequired = data.user != null && data.session == null;
  return { ok: true, data: { emailConfirmationRequired } };
}

export async function signIn(input: { email: string; password: string }): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  });

  if (error) {
    return { ok: false, message: toHumanMessage(error) };
  }
  return { ok: true, data: undefined };
}

export async function signOut(scope: "local" | "global" = "local"): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut({ scope });
  if (error) {
    return { ok: false, message: toHumanMessage(error) };
  }
  return { ok: true, data: undefined };
}

export async function sendPasswordResetEmail(email: string): Promise<AuthResult> {
  const options = typeof window !== "undefined" ? { redirectTo: `${window.location.origin}/reset-password` } : {};
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), options);
  if (error) {
    return { ok: false, message: toHumanMessage(error) };
  }
  return { ok: true, data: undefined };
}

/**
 * Must be called on the /reset-password page, which the user reaches
 * only via the emailed link (Supabase exchanges that link for a
 * short-lived recovery session automatically via detectSessionInUrl).
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { ok: false, message: toHumanMessage(error) };
  }
  return { ok: true, data: undefined };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Roles come only from public.user_roles via this RPC — never trust a
 * client-side guess. See migration 20260918000300 (public.current_user_roles).
 */
export async function getCurrentUserRoles(): Promise<string[]> {
  const { data, error } = await supabase.rpc("current_user_roles");
  if (error || !data) return [];
  return data as string[];
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}
