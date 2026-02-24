import { useState } from "react";
import { X, Copy, Check, MessageCircle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";
import { toast } from "sonner";

export interface StoredRequest {
  code: string;
  fileId: string;
  projectId: string;
  folderId: string;
  folderName: string;
  requestDescription: string;
  fileTypeGuidance: string;
  businessName: string;
  createdAt: string;
  active: boolean;
}

function generateRequestToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 32; i++) result += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateAccessCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `RQST-${n}`;
}

interface RequestFilesModalProps {
  fileId: string;
  projectId: string;
  folderId: string;
  folderName: string;
  onClose: () => void;
}

export default function RequestFilesModal({
  fileId,
  projectId,
  folderId,
  folderName,
  onClose,
}: RequestFilesModalProps) {
  const { profile } = useSettings();
  const [requestDescription, setRequestDescription] = useState("");
  const [fileTypeGuidance, setFileTypeGuidance] = useState("");
  const [generated, setGenerated] = useState<{ token: string; code: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const canGenerate = requestDescription.trim().length >= 3;
  const requestLink = generated
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/request?token=${generated.token}`
    : "";
  const businessName = profile.businessNameOrUserName?.trim() || "Lunex.com";

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const token = generateRequestToken();
    const code = generateAccessCode();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to create an upload request.");
        return;
      }
      const { error } = await supabase.from("upload_requests").insert({
        token,
        code,
        folder_id: folderId,
        project_id: projectId,
        client_file_id: fileId,
        user_id: user.id,
        request_description: requestDescription.trim(),
        file_type_guidance: fileTypeGuidance.trim(),
        business_name: businessName,
        is_active: true,
      });
      if (error) throw error;
      setGenerated({ token, code });
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  };

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

  // One short "What I need" line only (avoid duplication if user pasted full message into the field)
  const descriptionOneLine = requestDescription.trim().split(/\n/)[0]?.slice(0, 200) || "documents";
  const whatsappMessage = generated
    ? `Hi. I need you to upload some documents for me. Please tap the link below and use the code to upload your files.\n\nWhat I need: ${descriptionOneLine}\n\n<${requestLink}>\n\nCode: ${generated.code}\n\nPowered by Lunex.`
    : "";
  const emailSubject = `Document upload request from ${businessName}`;
  const emailBody = generated
    ? `Hi. I need you to upload some documents for me. Please tap the link below and use the code to upload your files.\n\nWhat I need: ${descriptionOneLine}\n\n<${requestLink}>\n\nCode: ${generated.code}\n\nPowered by Lunex.`
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
            <h2 className="font-semibold text-foreground text-lg">Request Files</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate a link so your client can upload files directly to this folder.
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900 space-y-1">
            <p>
              <span className="text-blue-800">Destination folder: </span>
              <strong>{folderName}</strong>
            </p>
            <p className="text-blue-700 text-xs">Uploads from this link go only to this folder. Other folders in the project are not affected.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">What are you requesting?</label>
            <input
              type="text"
              value={requestDescription}
              onChange={(e) => setRequestDescription(e.target.value)}
              placeholder="e.g. ID document, proof of address, signed contract, photos of the installation"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={!!generated}
            />
            <p className="text-xs text-muted-foreground mt-1">Shown to your client so they know what to upload. Required.</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Accepted file types (optional)</label>
            <input
              type="text"
              value={fileTypeGuidance}
              onChange={(e) => setFileTypeGuidance(e.target.value)}
              placeholder="e.g. PDF, JPG, PNG or leave blank to accept any file"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={!!generated}
            />
          </div>

          {!generated ? (
            <Button
              className="w-full bg-[#1B4F8A] hover:bg-[#1B4F8A]/90 text-white py-6 text-base font-semibold"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              Generate Request Link
            </Button>
          ) : (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Request link</label>
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
                    title="Open link in new tab"
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
                  {copiedLink ? "Copied" : "Copy Link"}
                </Button>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  {copiedCode ? <Check className="h-3.5 w-3.5 mr-1 text-success" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedCode ? "Copied" : "Copy Code"}
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
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
