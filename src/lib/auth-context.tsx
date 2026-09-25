import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { devLog } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

type AuthStatus = "loading" | "signed_out" | "signed_in" | "error";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Roles come only from public.current_user_roles() — never from the client. */
  roles: UserRole[];
  refresh: () => Promise<void>;
  signOut: (scope?: "local" | "global") => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [initialised, setInitialised] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitialised(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Do not call other Supabase methods synchronously in this callback.
      setSession(next);
      setInitialised(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const load = useCallback(async (id: string) => {
    setFailed(false);
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.rpc("current_user_roles"),
      ]);
      if (profileRes.error || rolesRes.error) {
        devLog("auth.load", profileRes.error ?? rolesRes.error);
        setFailed(true);
        return;
      }
      setProfile((profileRes.data as Profile | null) ?? null);
      setRoles(((rolesRes.data as UserRole[] | null) ?? []).filter(Boolean));
      setLoadedFor(id);
    } catch (error) {
      devLog("auth.load", error);
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setRoles([]);
      setLoadedFor(null);
      setFailed(false);
      if (previousUserId.current) queryClient.clear(); // never keep another user's cached data
      previousUserId.current = null;
      return;
    }
    if (previousUserId.current && previousUserId.current !== userId) queryClient.clear();
    previousUserId.current = userId;
    void load(userId);
  }, [userId, load, queryClient]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  const signOut = useCallback(
    async (scope: "local" | "global" = "local") => {
      await supabase.auth.signOut({ scope });
      queryClient.clear();
    },
    [queryClient],
  );

  const status: AuthStatus = !initialised
    ? "loading"
    : !session
      ? "signed_out"
      : failed
        ? "error"
        : loadedFor === session.user.id
          ? "signed_in"
          : "loading";

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, user: session?.user ?? null, profile, roles, refresh, signOut }),
    [status, session, profile, roles, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

/** For pages rendered inside a guarded workspace: the user is guaranteed to exist. */
export function useCurrentUser(): { userId: string; profile: Profile | null; roles: UserRole[] } {
  const { user, profile, roles } = useAuth();
  if (!user) throw new Error("useCurrentUser used outside an authenticated workspace.");
  return { userId: user.id, profile, roles };
}
