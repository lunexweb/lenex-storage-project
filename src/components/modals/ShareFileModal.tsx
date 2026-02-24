import { useState } from "react";
import { X, Copy, Check, MessageCircle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { createViewShare, getViewShareLink } from "@/lib/viewShare";
import { mapSupabaseError } from "@/lib/supabaseError";
import { toast } from "sonner";

interface ShareFileModalProps {
  fileId: string;
  projectId: string;
  folderId: string;
  folderFileId: string;
  fileName: string;
  onClose: () => void;
}

export default function ShareFileModal({
  fileId,
  projectId,
  folderId,
  folderFileId,
  fileName,
  onClose,
}: ShareFileModalProps) {
  const { profile } = useSettings();
  const [generated, setGenerated] = useState<{ token: string; code: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const businessName = profile.businessNameOrUserName?.trim() || "Lunex.com";

  const handleGenerate = async () => {
    setGenerateError("");
    setGenerating(true);
    try {
      const { token, code } = await createViewShare({
        type: "file",
        fileId,
        projectId,
        folderId,
        folderFileId,
        code: "",
      });
      setGenerated({ token, code });
    } catch (err) {
      const msg = mapSupabaseError(err);
      setGenerateError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const requestLink = generated ? getViewShareLink(generated.token) : "";

  const copyLink = () => {
    if (requestLink) {
      navigator.clipboard.writeText(requestLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyCode = () => {
    if (generated?.code) {
      navigator.clipboard.writeText(generated.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Wrap link in angle brackets so WhatsApp and email clients reliably detect it as clickable
  const whatsappMessage = generated
    ? `You have been sent a file to view from ${businessName}.\n\nOpen the link below and enter the code to view it (view only).\n\n<${requestLink}>\n\nCode: ${generated.code}\n\nFile: ${fileName}`
    : "";
  const emailSubject = `View file from ${businessName}`;
  const emailBody = generated
    ? `You have been sent a file to view from ${businessName}.\n\nOpen the link below and enter the code to view it (view only).\n\n<${requestLink}>\n\nCode: ${generated.code}\n\nFile: ${fileName}`
    : "";

  const openWhatsApp = () => {
    if (whatsappMessage) {
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
    }
  };

  const openEmail = () => {
    if (emailBody) {
      window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-lg">Share to view</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share this file via link and code. Recipient can view only (no download/edit).
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm">
            <span className="text-muted-foreground">File: </span>
            <strong className="text-foreground truncate block">{fileName}</strong>
          </div>

          {!generated ? (
            <>
              <Button
                className="w-full bg-[#1B4F8A] hover:bg-[#1B4F8A]/90 text-white py-6 text-base font-semibold"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? "Generating…" : "Generate link &amp; code"}
              </Button>
              {generateError && <p className="text-sm text-destructive">{generateError}</p>}
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Link</label>
                <div className="flex gap-2">
                  <input
                    value={requestLink}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm font-mono text-foreground"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(requestLink, "_blank", "noopener,noreferrer")}
                    title="Open link"
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Access code</label>
                <p className="text-2xl font-bold font-mono text-foreground">{generated.code}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {copiedLink ? <Check className="h-3.5 w-3.5 mr-1 text-success" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedLink ? "Copied" : "Copy link"}
                </Button>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  {copiedCode ? <Check className="h-3.5 w-3.5 mr-1 text-success" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedCode ? "Copied" : "Copy code"}
                </Button>
              </div>
              <Button
                size="sm"
                className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
                onClick={openWhatsApp}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Share via WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={openEmail}
              >
                <Mail className="h-3.5 w-3.5 mr-1" /> Share via Email
              </Button>
            </>
          )}

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
