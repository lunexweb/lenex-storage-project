import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasRecoverySession(!!session?.user);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasRecoverySession(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    if (password.length < 6) return;
    setLoading(true);
    try {
      await updatePassword(password);
      navigate("/login", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center bg-background px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-xl font-bold text-foreground">Invalid or expired link</h1>
          <p className="text-muted-foreground text-sm">
            Use the link from your password reset email, or request a new one.
          </p>
          <Link to="/forgot-password" className="inline-block text-primary font-medium hover:underline">
            Request reset link
          </Link>
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: branding panel – navy */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-center items-center bg-navy text-white px-10 py-16">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gold flex items-center justify-center text-gold-foreground font-bold text-sm tracking-tight shrink-0">
              L
            </div>
            <span className="text-2xl tracking-tight text-white">
              <span className="font-bold">Lunex</span>
              <span className="font-normal text-white">.com</span>
            </span>
          </div>
          <p className="text-navy-foreground text-base leading-relaxed">
            Find any client file in seconds.
          </p>
          <p className="text-navy-foreground/90 text-sm leading-relaxed">
            Stop searching through WhatsApp, email, and paper folders. Lunex gives every client their own organised file — ready when you need it.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-background px-6 py-12 lg:py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
            <p className="text-muted-foreground text-sm">Choose a new password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn("h-11 pl-10 border-border bg-card")}
                  autoComplete="new-password"
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn("h-11 pl-10 border-border bg-card")}
                  autoComplete="new-password"
                  disabled={loading}
                  minLength={6}
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              size="lg"
              disabled={loading || password.length < 6 || password !== confirmPassword}
            >
              <ArrowRight className="h-4 w-4" />
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary font-medium hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
