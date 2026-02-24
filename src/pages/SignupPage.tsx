import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    signup(trimmedEmail, trimmedName || trimmedEmail.split("@")[0] || "User", password, { popiaConsent, termsConsent });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: branding panel – navy */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-center items-center bg-navy text-white px-10 py-12 shrink-0">
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

      {/* Right: signup form – scrollable so all text (including footer) is visible */}
      <div className="flex-1 flex flex-col items-center bg-background px-6 py-6 lg:py-8 min-h-0 overflow-y-auto">
        <div className="w-full max-w-sm space-y-5 py-4">
          <div className="space-y-1 text-center lg:text-left shrink-0">
            <h1 className="text-xl font-bold text-foreground">Create an account</h1>
            <p className="text-muted-foreground text-sm">Sign up to get started with Lunex.com</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="signup-name" className="text-foreground text-sm">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn("h-10 pl-10 border-border bg-card text-sm")}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="signup-email" className="text-foreground text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn("h-10 pl-10 border-border bg-card text-sm")}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="signup-password" className="text-foreground text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn("h-10 pl-10 border-border bg-card text-sm")}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="signup-confirm" className="text-foreground text-sm">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn("h-10 pl-10 border-border bg-card text-sm")}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={popiaConsent}
                  onChange={(e) => setPopiaConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input border-primary text-primary focus:ring-primary shrink-0"
                  aria-required="true"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground/90">
                  I consent to Lunex collecting and processing my personal information as described in the{" "}
                  <Link to="/privacy" className="text-primary underline hover:no-underline">Privacy Policy</Link>.
                  This is required for operating my account and providing the client management service.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsConsent}
                  onChange={(e) => setTermsConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-input border-primary text-primary focus:ring-primary shrink-0"
                  aria-required="true"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground/90">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary underline hover:no-underline">Terms of Service</Link>
                  {" "}and understand that my data is stored securely and will never be sold or shared with third parties without my explicit consent.
                </span>
              </label>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                !popiaConsent ||
                !termsConsent ||
                !email.trim() ||
                !password ||
                password.length < 6 ||
                password !== confirmPassword
              }
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm disabled:opacity-50 disabled:pointer-events-none"
              size="lg"
            >
              <ArrowRight className="h-4 w-4" />
              Sign up
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground shrink-0">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            {" · "}
            <Link to="/forgot-password" className="text-primary font-medium hover:underline">Forgot password?</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground shrink-0 mt-4 pb-6">
            By signing up you agree to our{" "}
            <Link to="/terms" className="text-primary underline hover:no-underline">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary underline hover:no-underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
