import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/constants";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
  team_code: string | null; // Virtual for UI
  department_id: string | null;
  department_code: string | null; // Virtual for UI
  region: string | null;
  approved: boolean;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*, team:teams(code), department:departments(code)").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (p) {
      (p as any).team_code = (p as any).team?.code || null;
      (p as any).department_code = (p as any).department?.code || null;
    }
    setProfile(p as Profile | null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };

  useEffect(() => {
    let initialLoadDone = false;

    // NOTE: onAuthStateChange callback must NOT be async — Supabase holds an
    // internal navigator lock during this callback. Making it async causes a
    // deadlock / 5000ms timeout. Use setTimeout(0) to escape the lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt, sess) => {
      if (evt === 'PASSWORD_RECOVERY') {
        window.location.hash = "/update-password";
      }
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          loadProfileAndRoles(sess.user.id).then(() => {
            if (!initialLoadDone) {
              initialLoadDone = true;
              setLoading(false);
            }
          });
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        if (!initialLoadDone) {
          initialLoadDone = true;
          setLoading(false);
        }
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!initialLoadDone) {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) await loadProfileAndRoles(s.user.id);
        initialLoadDone = true;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadProfileAndRoles(user.id);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `https://erc-six.vercel.app/`,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://erc-six.vercel.app/`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (r: AppRole) => roles.includes(r);

  return (
    <Ctx.Provider value={{ user, session, profile, roles, loading, signIn, signUp, resetPassword, updatePassword, signOut, hasRole, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
