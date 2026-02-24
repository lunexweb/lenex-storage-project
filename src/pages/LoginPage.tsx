import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    login(email.trim(), password);
  };

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

      {/* Right: login form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-background px-6 py-12 lg:py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn("h-11 pl-10 border-border bg-card")}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn("h-11 pl-10 pr-10 border-border bg-card")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium" size="lg">
              <ArrowRight className="h-4 w-4" />
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By logging in you agree to our{" "}
            <Link to="/terms" className="text-primary underline hover:no-underline">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="text-primary underline hover:no-underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
