import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, User, ArrowRight, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useSettings, type AccountType, type ProfileRole } from "@/context/SettingsContext";
import { cn } from "@/lib/utils";

const ROLES: { value: ProfileRole; label: string }[] = [
  { value: "accountant", label: "Accountant" },
  { value: "marketer", label: "Marketer" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const { profile, updateProfile } = useSettings();

  const [accountType, setAccountType] = useState<AccountType>(profile.accountType);
  const [name, setName] = useState(profile.businessNameOrUserName);
  const [role, setRole] = useState<ProfileRole>(profile.role);
  const [roleOther, setRoleOther] = useState(profile.roleOther);
  const [industry, setIndustry] = useState(profile.industry);

  const isLast = step === 2;
  const canProceedStep0 = name.trim().length > 0;
  const canProceedStep1 = role !== "other" || roleOther.trim().length > 0;
  const canProceedStep2 = industry.trim().length > 0;

  const handleNext = () => {
    if (step === 0) {
      if (!canProceedStep0) return;
      updateProfile({ accountType, businessNameOrUserName: name.trim() });
      setStep(1);
    } else if (step === 1) {
      if (!canProceedStep1) return;
      updateProfile({ role, roleOther: role === "other" ? roleOther.trim() : "" });
      setStep(2);
    } else {
      if (!canProceedStep2) return;
      updateProfile({ industry: industry.trim() });
      completeOnboarding();
      navigate("/", { replace: true });
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    navigate("/", { replace: true });
  };

  const nameLabel = accountType === "business" ? "Business Name" : "User name";
  const namePlaceholder = accountType === "business" ? "e.g. Acme Ltd" : "e.g. Jane Smith";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-3 text-sm text-foreground">
            <Shield className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p>
              Your information is protected under the Protection of Personal Information Act No 4 of 2013. Lunex collects only the information necessary to provide your client management service. You can request deletion of your data at any time by contacting support@lunexweb.com.
            </p>
          </div>

          <div className="flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">How do you use Lunex.com?</h1>
                <p className="mt-1 text-muted-foreground text-sm">Choose one and enter your name.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 transition-colors",
                    accountType === "business"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">Business</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("individual")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 transition-colors",
                    accountType === "individual"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <User className="h-5 w-5" />
                  <span className="font-medium">Individual</span>
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-name">{nameLabel}</Label>
                <Input
                  id="onboarding-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  className="h-11"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">What best describes you?</h1>
                <p className="mt-1 text-muted-foreground text-sm">Select your role.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={cn(
                      "py-3 px-4 rounded-xl border-2 text-left transition-colors",
                      role === r.value
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {role === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="onboarding-role-other">Please specify</Label>
                  <Input
                    id="onboarding-role-other"
                    value={roleOther}
                    onChange={(e) => setRoleOther(e.target.value)}
                    placeholder="e.g. Consultant, Designer"
                    className="h-11"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">What industry are you in?</h1>
                <p className="mt-1 text-muted-foreground text-sm">Helps us tailor your experience.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="onboarding-industry">Industry</Label>
                <Input
                  id="onboarding-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Legal, Healthcare, Marketing"
                  className="h-11"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleNext}
              disabled={
                (step === 0 && !canProceedStep0) ||
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              size="lg"
            >
              {isLast ? "Get started" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              Skip for now
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
