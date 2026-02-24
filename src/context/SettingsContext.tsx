import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";
import { toast } from "sonner";

export type AccountType = "business" | "individual";
export type ProfileRole = "accountant" | "marketer" | "manager" | "other";

export interface Profile {
  accountType: AccountType;
  businessNameOrUserName: string;
  role: ProfileRole;
  roleOther: string;
  industry: string;
  /** Example reference format for auto-generation, e.g. REF-001, STU-2024-0001 */
  referenceFormatExample: string;
  /** Example project number format for auto-generation, e.g. PRJ-0001 */
  projectNumberFormatExample: string;
}

const defaultProfile: Profile = {
  accountType: "business",
  businessNameOrUserName: "",
  role: "other",
  roleOther: "",
  industry: "",
  referenceFormatExample: "",
  projectNumberFormatExample: "",
};

interface SettingsContextType {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

function rowToProfile(row: Record<string, unknown> | null): Profile {
  if (!row) return { ...defaultProfile };
  return {
    accountType: (row.account_type as AccountType) ?? defaultProfile.accountType,
    businessNameOrUserName: (row.business_name as string) ?? defaultProfile.businessNameOrUserName,
    role: (row.role as ProfileRole) ?? defaultProfile.role,
    roleOther: (row.role_other as string) ?? defaultProfile.roleOther,
    industry: (row.industry as string) ?? defaultProfile.industry,
    referenceFormatExample: (row.reference_format_example as string) ?? defaultProfile.referenceFormatExample,
    projectNumberFormatExample: (row.project_number_format_example as string) ?? defaultProfile.projectNumberFormatExample,
  };
}

function profileToRow(updates: Partial<Profile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (updates.accountType !== undefined) row.account_type = updates.accountType;
  if (updates.businessNameOrUserName !== undefined) row.business_name = updates.businessNameOrUserName;
  if (updates.role !== undefined) row.role = updates.role;
  if (updates.roleOther !== undefined) row.role_other = updates.roleOther;
  if (updates.industry !== undefined) row.industry = updates.industry;
  if (updates.referenceFormatExample !== undefined) row.reference_format_example = updates.referenceFormatExample;
  if (updates.projectNumberFormatExample !== undefined) row.project_number_format_example = updates.projectNumberFormatExample;
  return row;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => defaultProfile);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile({ ...defaultProfile });
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("account_type, business_name, role, role_other, industry, reference_format_example, project_number_format_example")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        setProfile({ ...defaultProfile });
        return;
      }
      setProfile(rowToProfile(data));
    } catch {
      setProfile({ ...defaultProfile });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(mapSupabaseError(new Error("Not signed in")));
        return;
      }
      const row = profileToRow(updates);
      row.updated_at = new Date().toISOString();
      const { error } = await supabase.from("profiles").upsert({ id: user.id, ...row }, { onConflict: "id" });
      if (error) {
        toast.error(mapSupabaseError(error));
        return;
      }
      setProfile((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, []);

  const value: SettingsContextType = { profile, updateProfile };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export const ROLE_LABELS: Record<ProfileRole, string> = {
  accountant: "Accountant",
  marketer: "Marketer",
  manager: "Manager",
  other: "Other",
};
