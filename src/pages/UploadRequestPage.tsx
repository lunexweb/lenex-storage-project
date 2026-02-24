import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CloudUpload, X, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandName, BRAND_TAGLINE } from "@/components/BrandName";
import PublicBrandLayout from "@/components/layout/PublicBrandLayout";
import { toast } from "sonner";
import type { FolderFile } from "@/data/mockData";
import type { StoredRequest } from "@/components/modals/RequestFilesModal";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";

const BUCKET = "lunex-files";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_JPEG_QUALITY = 0.75;
const IMAGE_COMPRESS_THRESHOLD_BYTES = 250 * 1024; // compress images over ~250KB

function isImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

/** Compress image to JPEG data URL to reduce storage size; rejects if not an image or canvas fails. */
function compressImageToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_JPEG_QUALITY);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

async function fileToDataURL(file: File): Promise<string> {
  if (isImageFile(file) && file.size > IMAGE_COMPRESS_THRESHOLD_BYTES) {
    try {
      return await compressImageToDataURL(file);
    } catch {
      return readFileAsDataURL(file);
    }
  }
  return readFileAsDataURL(file);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeFromFile(file: File): FolderFile["fileType"] {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type.includes("video/") || /\.(mp4|webm|mov|avi)$/i.test(name)) return "video";
  if (type.includes("word") || type.includes("document") || /\.(doc|docx)$/i.test(name)) return "word";
  if (type.includes("sheet") || type.includes("excel") || /\.(xls|xlsx|csv)$/i.test(name)) return "excel";
  return "other";
}

const fileTypeIcon = (ft: string) => {
  const c: Record<string, string> = {
    pdf: "text-red-500",
    word: "text-blue-500",
    excel: "text-green-600",
    image: "text-teal-500",
    video: "text-purple-500",
    other: "text-muted-foreground",
  };
  return c[ft] ?? c.other;
};

type Screen = "invalid" | "closed" | "code" | "upload" | "success";

interface StagedFile {
  id: string;
  name: string;
  size: string;
  fileType: FolderFile["fileType"];
  uploadDate: string;
  url?: string;
  /** Keep File ref for re-reading if needed; we build FolderFile when sending */
  raw?: File;
}

export default function UploadRequestPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [request, setRequest] = useState<StoredRequest | null>(null);
  const [screen, setScreen] = useState<Screen>("code");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [codeLocked, setCodeLocked] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sentNames, setSentNames] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ total: number; completed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingFilesRef = useRef(false);

  // Request row from DB (for user_id when sending files)
  const [requestRow, setRequestRow] = useState<{
    user_id: string;
    folder_id: string;
    request_description: string;
    file_type_guidance: string;
    business_name: string;
    is_active: boolean;
    folders: { name: string } | null;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setScreen("invalid");
      setResolved(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("upload_requests")
        .select("code, user_id, folder_id, project_id, client_file_id, request_description, file_type_guidance, business_name, is_active, created_at, folders(name)")
        .eq("token", token)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setScreen("invalid");
        setResolved(true);
        return;
      }
      const row = data as typeof data & { code: string; folders: { name: string } | null };
      setRequestRow({
        user_id: row.user_id,
        folder_id: row.folder_id,
        request_description: row.request_description ?? "",
        file_type_guidance: row.file_type_guidance ?? "",
        business_name: row.business_name ?? "",
        is_active: row.is_active,
        folders: row.folders,
      });
      setRequest({
        code: row.code,
        fileId: row.client_file_id,
        projectId: row.project_id,
        folderId: row.folder_id,
        folderName: row.folders?.name ?? "Folder",
        requestDescription: row.request_description ?? "",
        fileTypeGuidance: row.file_type_guidance ?? "",
        businessName: row.business_name ?? "",
        createdAt: row.created_at ?? new Date().toISOString(),
        active: row.is_active,
      });
      if (!row.is_active) setScreen("closed");
      setResolved(true);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeLocked || !request) return;
    const entered = codeInput.trim();
    if (!entered) return;
    if (entered.toUpperCase() !== request.code.toUpperCase()) {
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
    setScreen("upload");
  };

  const processUploadedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (isProcessingFilesRef.current) return;
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;
    isProcessingFilesRef.current = true;
    const today = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
    const newStaged: StagedFile[] = [];
    for (let i = 0; i < filesArray.length; i++) {
      const f = filesArray[i];
      try {
        const dataUrl = await fileToDataURL(f);
        newStaged.push({
          id: `staged-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
          name: f.name,
          size: formatFileSize(f.size),
          fileType: getFileTypeFromFile(f),
          uploadDate: today,
          url: dataUrl,
          raw: f,
        });
      } catch {
        toast.error(`Could not read file: ${f.name}`);
      }
    }
    isProcessingFilesRef.current = false;
    if (newStaged.length === 0) return;
    setStagedFiles((prev) => {
      const byKey = new Set(prev.map((p) => `${p.name}|${p.raw?.size ?? p.size}`));
      const deduped = newStaged.filter((s) => {
        const key = `${s.name}|${s.raw?.size ?? s.size}`;
        if (byKey.has(key)) return false;
        byKey.add(key);
        return true;
      });
      return [...prev, ...deduped];
    });
  };

  const removeStaged = (id: string) => {
    setStagedFiles((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.url && item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const sendFiles = async () => {
    setSendError("");
    if (!request || !requestRow || stagedFiles.length === 0) return;
    if (isSending) return;
    const seen = new Set<string>();
    const toSend = stagedFiles.filter((s) => {
      const key = `${s.name}|${s.raw?.size ?? 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (toSend.length === 0) return;
    setIsSending(true);
    setSendProgress({ total: toSend.length, completed: 0 });
    const userId = requestRow.user_id;
    const folderId = requestRow.folder_id;
    const today = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
    try {
      let completed = 0;
      for (const s of toSend) {
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const ext = s.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
        const path = `${userId}/${folderId}/${id}.${ext}`;
        const blob = s.raw
          ? new Blob([await s.raw.arrayBuffer()], { type: s.raw.type })
          : await fetch(s.url!).then((r) => r.blob());
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: signedData, error: signedErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 31536000);
        const urlToStore = !signedErr && signedData?.signedUrl ? signedData.signedUrl : "";
        if (!urlToStore) throw new Error("Failed to get signed URL");
        const { error: insertErr } = await supabase.from("folder_files").insert({
          id,
          folder_id: folderId,
          user_id: userId,
          name: s.name,
          file_type: s.fileType,
          size: s.size,
          size_in_bytes: s.raw?.size ?? null,
          upload_date: today,
          storage_path: path,
          url: urlToStore,
        });
        if (insertErr) throw insertErr;
        completed += 1;
        setSendProgress((prev) => (prev ? { ...prev, completed } : null));
      }
      setSentNames(toSend.map((s) => s.name));
      setScreen("success");
      toast.success("Files sent successfully.");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isUploadPermissionError = /400|policy|security|permission|rls|row level security/i.test(errMsg);
      const message = isUploadPermissionError
        ? "Upload failed. The upload link may have expired or permissions have changed. Please contact the person who sent you this link."
        : mapSupabaseError(err);
      setSendError(message);
      toast.error(message);
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  const invalidMessage = (
    <PublicBrandLayout>
      <div className="text-center max-w-md w-full">
        <p className="text-lg text-foreground mb-4">This upload link is not valid. Please contact the person who sent it to you.</p>
        <Link to="/" className="text-primary font-medium hover:underline">Go to Homepage</Link>
      </div>
    </PublicBrandLayout>
  );

  const closedMessage = (
    <PublicBrandLayout>
      <div className="text-center max-w-md w-full">
        <p className="text-lg text-foreground mb-4">This upload link has been closed. Please contact the person who sent it to you.</p>
        <Link to="/" className="text-primary font-medium hover:underline">Go to Homepage</Link>
      </div>
    </PublicBrandLayout>
  );

  if (!token && resolved) return invalidMessage;
  if (screen === "invalid") return invalidMessage;
  if (request && !request.active && screen === "closed") return closedMessage;
  if (screen === "closed") return closedMessage;

  if (!resolved) {
    return (
      <PublicBrandLayout>
        <p className="text-muted-foreground">Loading...</p>
      </PublicBrandLayout>
    );
  }

  if (screen === "code" && request) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md">
          <div className="space-y-2 text-center lg:text-left mb-6">
            <h1 className="text-2xl font-bold text-foreground">Upload Your Files</h1>
            <p className="text-muted-foreground text-sm">Enter the code you received to continue.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter your code e.g. RQST-7291"
                disabled={codeLocked}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              />
              {codeError && <p className="text-sm text-destructive">{codeError}</p>}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold min-h-[44px]"
                disabled={codeLocked}
              >
                Continue
              </Button>
            </form>
          </div>
        </div>
      </PublicBrandLayout>
    );
  }

  if (screen === "upload" && request) {
    return (
      <PublicBrandLayout contentClassName="justify-start pt-4 lg:pt-8">
        <div className="w-full max-w-lg flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setScreen("code")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              <BrandName />
            </span>
          </div>
          <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-center text-sm text-success font-medium">
            Secure upload portal. Your files go directly to the requester.
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Destination folder</p>
              <p className="text-base font-semibold text-foreground">{request.folderName}</p>
              <p className="text-xs text-muted-foreground mt-1">Files you send will be added only to this folder. Other folders are not affected.</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-1">What is being requested</h2>
              <p className="text-lg font-semibold text-foreground">{request.requestDescription}</p>
              {request.fileTypeGuidance && (
                <p className="text-sm text-muted-foreground mt-1">Accepted types: {request.fileTypeGuidance}</p>
              )}
              <p className="text-sm text-foreground mt-2">Requested by: <strong>{request.businessName}</strong></p>
              <p className="text-xs text-muted-foreground mt-1">Files you upload will be sent directly and securely to the requester.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Upload your files to this folder</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = e.target.files;
                  if (list?.length) processUploadedFiles(list);
                  e.target.value = "";
                }}
              />
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors min-h-[180px] flex flex-col items-center justify-center ${
                  isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const list = e.dataTransfer.files;
                  if (list?.length) processUploadedFiles(list);
                }}
              >
                <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-foreground font-medium">Drop your files here or tap to browse</p>
                <p className="text-sm text-muted-foreground mt-1">Any file type accepted</p>
              </div>

              {sendError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {sendError}
                </p>
              )}
              {sendProgress && (
                <p className="mt-2 text-sm font-medium text-foreground" role="status">
                  Sending {sendProgress.completed} of {sendProgress.total} files…
                </p>
              )}
              {stagedFiles.length > 0 && (
                <ul className="mt-4 space-y-2 max-h-[240px] overflow-y-auto">
                  {stagedFiles.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className={`text-lg ${fileTypeIcon(f.fileType)}`}>●</span>
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{f.size}</span>
                      <button
                        type="button"
                        onClick={() => removeStaged(f.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Remove"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                type="button"
                variant="gold"
                className="w-full mt-6 py-6 text-base font-semibold"
                onClick={() => sendFiles()}
                disabled={stagedFiles.length === 0 || isSending}
              >
                {isSending && sendProgress
                  ? `Sending ${sendProgress.completed} of ${sendProgress.total}…`
                  : "Send Files"}
              </Button>
            </div>
          </div>
        </div>
      </PublicBrandLayout>
    );
  }

  if (screen === "success") {
    return (
      <PublicBrandLayout>
        <div className="text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-10 w-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Files sent successfully</h1>
          <p className="text-muted-foreground mb-1">Your files have been received and saved securely.</p>
          {request && (
            <p className="text-sm font-medium text-foreground mb-6">They were added to the folder: <strong>{request.folderName}</strong></p>
          )}
          {!request && <p className="text-sm text-muted-foreground mb-6">They have been added to the requested folder.</p>}
          <ul className="text-left list-disc list-inside text-foreground space-y-1 mb-6">
            {sentNames.map((name) => (
              <li key={name} className="truncate">{name}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground mb-4">You can close this page.</p>
          <p className="text-xs text-muted-foreground">
            Powered by <BrandName /> — {BRAND_TAGLINE}
          </p>
        </div>
      </PublicBrandLayout>
    );
  }

  return null;
}
