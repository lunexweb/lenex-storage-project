import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { mapSupabaseError } from "@/lib/supabaseError";

export interface DemoUser {
  email: string;
  name: string;
}

interface AuthContextType {
  user: DemoUser | null;
  isLoggedIn: boolean;
  onboardingComplete: boolean;
  login: (email: string, password: string, name?: string) => void;
  signup: (email: string, name: string, password: string, consent?: { popiaConsent: boolean; termsConsent: boolean }) => void;
  logout: () => void;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("business_name, onboarding_complete").eq("id", userId).maybeSingle();
      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  const syncSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setOnboardingComplete(false);
        setLoading(false);
        return;
      }
      const profile = await fetchProfile(session.user.id);
      const name = profile?.business_name?.trim() || session.user.email?.split("@")[0] || "User";
      setUser({ email: session.user.email ?? "", name });
      setOnboardingComplete(profile?.onboarding_complete ?? false);
    } catch {
      setUser(null);
      setOnboardingComplete(false);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    syncSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });
    return () => subscription.unsubscribe();
  }, [syncSession]);

  const login = useCallback(async (email: string, password: string, _name?: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(mapSupabaseError(error));
        return;
      }
      await syncSession();
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, [syncSession]);

  const signup = useCallback(async (email: string, name: string, password: string, consent?: { popiaConsent: boolean; termsConsent: boolean }) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() || email.split("@")[0] } } });
      if (error) {
        toast.error(mapSupabaseError(error));
        return;
      }
      if (data?.user) {
        const now = new Date().toISOString();
        await supabase.from("profiles").upsert({
          id: data.user.id,
          business_name: name.trim() || email.split("@")[0] || "User",
          onboarding_complete: false,
          updated_at: now,
          ...(consent?.popiaConsent && {
            popia_consent: true,
            popia_consent_date: now,
          }),
          ...(consent?.termsConsent && {
            terms_consent: true,
            terms_consent_date: now,
          }),
        });
      }
      toast.success("Account created successfully. Please check your email to confirm your account.");
      await syncSession();
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, [syncSession]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setOnboardingComplete(false);
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    try {
      // Redirect URL for the link in the reset email. Add https://lunexweb.com/reset-password (and localhost for dev) to Supabase Auth → URL Configuration → Redirect URLs.
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        toast.error(mapSupabaseError(error));
        return;
      }
      toast.success("Check your email for a link to reset your password.");
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(mapSupabaseError(error));
        return;
      }
      toast.success("Password updated. You can sign in with your new password.");
      await supabase.auth.signOut();
      setUser(null);
      setOnboardingComplete(false);
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      await supabase.from("profiles").update({ onboarding_complete: true, updated_at: new Date().toISOString() }).eq("id", u.id);
      setOnboardingComplete(true);
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    onboardingComplete,
    login,
    signup,
    logout,
    resetPasswordForEmail,
    updatePassword,
    completeOnboarding,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
