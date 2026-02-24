import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Building2, Mail, CreditCard, Pencil, User, Hash, HardDrive, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import {
  useSettings,
  type AccountType,
  type Profile,
  type ProfileRole,
  ROLE_LABELS,
} from "@/context/SettingsContext";
import { useData } from "@/context/DataContext";
import { cn, formatStorageSize } from "@/lib/utils";

const ROLES: { value: ProfileRole; label: string }[] = [
  { value: "accountant", label: "Accountant" },
  { value: "marketer", label: "Marketer" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, updateProfile } = useSettings();
  const { files, loading, getTotalStorageUsed, STORAGE_LIMIT_BYTES } = useData();
  const [editOpen, setEditOpen] = useState(false);

  const totalStorageBytes = useMemo(() => getTotalStorageUsed(), [files, getTotalStorageUsed]);
  const totalStorageFormatted = useMemo(() => formatStorageSize(totalStorageBytes), [totalStorageBytes]);
  const storageBarPercent = useMemo(
    () => Math.min(100, (totalStorageBytes / STORAGE_LIMIT_BYTES) * 100),
    [totalStorageBytes, STORAGE_LIMIT_BYTES]
  );
  const storageBarColor =
    storageBarPercent >= 95 ? "bg-red-500" : totalStorageBytes > 80 * 1024 * 1024 ? "bg-orange-500" : "bg-primary";

  const displayName = profile.businessNameOrUserName?.trim() || (profile.accountType === "business" ? "Business name" : "Your name");
  const roleDisplay = profile.role === "other" && profile.roleOther ? profile.roleOther : ROLE_LABELS[profile.role];
  const subtitle = [roleDisplay, profile.industry].filter(Boolean).join(" · ") || "Set in onboarding";

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your profile and billing.</p>

      {loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading your data…</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-6 mb-8 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-4 w-56 bg-muted/80 rounded" />
              </div>
            </div>
            <div className="grid gap-4 pt-4 border-t border-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full max-w-sm bg-muted/80 rounded" />
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 mb-8 animate-pulse">
            <div className="h-5 w-32 bg-muted rounded mb-4" />
            <div className="h-3 w-full bg-muted/80 rounded mb-2" />
            <div className="h-6 w-full bg-muted/60 rounded" />
          </div>
        </>
      )}

      {!loading && (
        <>
      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gold flex items-center justify-center text-gold-foreground font-bold text-2xl">
              {displayName.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shrink-0">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
        <div className="grid gap-4 pt-4 border-t border-border">
          {[
            {
              icon: profile.accountType === "business" ? Building2 : User,
              label: profile.accountType === "business" ? "Business Name" : "User name",
              value: profile.businessNameOrUserName || "—",
            },
            { icon: Mail, label: "Email", value: user?.email || "—" },
            {
              icon: SettingsIcon,
              label: "Role",
              value: roleDisplay || "—",
            },
            {
              icon: Building2,
              label: "Industry",
              value: profile.industry || "—",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reference format */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Reference format</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          References are unique per file (e.g. student number, solar ID, case ref). New files get an auto-generated reference in this format; you can edit it later. Each reference must be unique.
        </p>
        <div className="space-y-2">
          <Label htmlFor="ref-format">Example reference format</Label>
          <Input
            id="ref-format"
            value={profile.referenceFormatExample ?? ""}
            onChange={(e) => updateProfile({ referenceFormatExample: e.target.value })}
            placeholder="e.g. REF-001, STU-2024-0001, SOL-12345"
            className="max-w-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">Auto-generated and editable. Must be unique across all files.</p>
        </div>
        <div className="space-y-2 pt-2 border-t border-border">
          <Label htmlFor="proj-format">Example project number format</Label>
          <Input
            id="proj-format"
            value={profile.projectNumberFormatExample ?? ""}
            onChange={(e) => updateProfile({ projectNumberFormatExample: e.target.value })}
            placeholder="e.g. PRJ-0001, JOB-2024-001"
            className="max-w-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">Each project gets a unique auto-generated number in this format. File ID and project ID are always unique and cannot be changed.</p>
        </div>
      </div>

      {/* Storage */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Storage</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalStorageFormatted}</span> of 100 MB used
        </p>
        <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", storageBarColor)}
            style={{ width: `${storageBarPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your account includes 100 MB of storage. Upgrade your plan for more storage.
        </p>
      </div>

      {/* Billing */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Billing</h2>
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium text-foreground">No active plan</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          View Plans
        </Button>
      </div>
        </>
      )}

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        updateProfile={updateProfile}
      />
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  updateProfile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}) {
  const [accountType, setAccountType] = useState<AccountType>(profile.accountType);
  const [name, setName] = useState(profile.businessNameOrUserName);
  const [role, setRole] = useState<ProfileRole>(profile.role);
  const [roleOther, setRoleOther] = useState(profile.roleOther);
  const [industry, setIndustry] = useState(profile.industry);

  const resetForm = () => {
    setAccountType(profile.accountType);
    setName(profile.businessNameOrUserName);
    setRole(profile.role);
    setRoleOther(profile.roleOther);
    setIndustry(profile.industry);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const handleSave = () => {
    updateProfile({
      accountType,
      businessNameOrUserName: name.trim(),
      role,
      roleOther: role === "other" ? roleOther.trim() : "",
      industry: industry.trim(),
    });
    onOpenChange(false);
  };

  const nameLabel = accountType === "business" ? "Business Name" : "User name";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription className="sr-only">
            Edit your profile details such as name, role, and industry.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto min-h-0 flex-1">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAccountType("business")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg border-2 text-sm transition-colors",
                accountType === "business"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
              )}
            >
              <Building2 className="h-4 w-4" /> Business
            </button>
            <button
              type="button"
              onClick={() => setAccountType("individual")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg border-2 text-sm transition-colors",
                accountType === "individual"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
              )}
            >
              <User className="h-4 w-4" /> Individual
            </button>
          </div>
          <div className="space-y-2">
            <Label>{nameLabel}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={accountType === "business" ? "e.g. Acme Ltd" : "e.g. Jane Smith"}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "py-2 px-3 rounded-lg border-2 text-left text-sm transition-colors",
                    role === r.value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border bg-muted/30 hover:border-primary/50"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {role === "other" && (
              <Input
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
                placeholder="Specify your role"
                className="mt-2"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Legal, Healthcare"
            />
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
