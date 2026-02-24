import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getViewShare, type StoredViewShare } from "@/lib/viewShare";
import { BrandName, BRAND_TAGLINE } from "@/components/BrandName";
import PublicBrandLayout from "@/components/layout/PublicBrandLayout";

export default function ViewSharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [share, setShare] = useState<StoredViewShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [codeLocked, setCodeLocked] = useState(false);

  useEffect(() => {
    if (!token) {
      setShare(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getViewShare(token).then((s) => {
      if (!cancelled) {
        setShare(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeLocked || !share) return;
    const entered = codeInput.trim();
    if (!entered) return;
    if (entered.toUpperCase() !== share.code.toUpperCase()) {
      setCodeError("Incorrect code. Please check and try again.");
      const next = codeAttempts + 1;
      setCodeAttempts(next);
      if (next >= 3) {
        setCodeLocked(true);
        setCodeError("Too many attempts. Please contact the person who sent you this link.");
      }
      return;
    }
    setCodeError("");
    if (share.type === "file" && share.folderId != null && share.folderFileId != null) {
      navigate(
        `/file/${share.fileId}/project/${share.projectId}?folder=${share.folderId}&view=${encodeURIComponent(share.folderFileId)}`,
        { replace: true }
      );
      return;
    }
    if (share.type === "note" && share.noteId) {
      navigate(`/file/${share.fileId}/project/${share.projectId}?note=${encodeURIComponent(share.noteId)}`, {
        replace: true,
      });
      return;
    }
    setCodeError("Invalid share. Please use the link you were sent.");
  };

  if (!token) {
    return (
      <PublicBrandLayout>
        <div className="text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid link</h1>
          <p className="text-muted-foreground mb-4">This view link is missing a token. Please use the full link you were sent.</p>
          <p className="text-xs text-muted-foreground"><BrandName /> — {BRAND_TAGLINE}</p>
        </div>
      </PublicBrandLayout>
    );
  }

  if (loading) {
    return (
      <PublicBrandLayout>
        <div className="text-center max-w-md w-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
          <p className="text-xs text-muted-foreground mt-6"><BrandName /> — {BRAND_TAGLINE}</p>
        </div>
      </PublicBrandLayout>
    );
  }

  if (share === null) {
    return (
      <PublicBrandLayout>
        <div className="text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid or expired link</h1>
          <p className="text-muted-foreground mb-4">
            This view link is not valid or has expired. Please ask the sender for a new link and code.
          </p>
          <p className="text-xs text-muted-foreground"><BrandName /> — {BRAND_TAGLINE}</p>
        </div>
      </PublicBrandLayout>
    );
  }

  return (
    <PublicBrandLayout>
      <div className="w-full max-w-sm">
        <div className="space-y-2 text-center lg:text-left mb-6">
          <h1 className="text-2xl font-bold text-foreground">View shared content</h1>
          <p className="text-muted-foreground text-sm">
            Enter the access code you received to view the {share.type === "file" ? "file" : "note"}.
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="e.g. VIEW-1234"
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground font-mono text-center text-lg min-h-[44px]"
              autoFocus
              disabled={codeLocked}
              autoComplete="one-time-code"
            />
            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={codeLocked}>
              View
            </Button>
          </form>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          <BrandName /> — {BRAND_TAGLINE}
        </p>
      </div>
    </PublicBrandLayout>
  );
}
