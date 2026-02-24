import { useSearchParams, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { BrandName, BRAND_TAGLINE } from "@/components/BrandName";
import PublicBrandLayout from "@/components/layout/PublicBrandLayout";
import { useData } from "@/context/DataContext";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";
import { toast } from "sonner";
import { FolderOpen, FileText, Download, ArrowLeft, X, Loader2 } from "lucide-react";
import type { ClientFile, Project, Folder, FolderFile } from "@/data/mockData";

interface ShareRow {
  code: string;
  project_ids: string[];
  folder_ids: string[];
  client_file_id: string;
}

function rowToFolderFile(r: Record<string, unknown>): FolderFile {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    fileType: (r.file_type as FolderFile["fileType"]) ?? "other",
    size: String(r.size ?? "0"),
    sizeInBytes: typeof r.size_in_bytes === "number" ? r.size_in_bytes : undefined,
    uploadDate: String(r.upload_date ?? ""),
    url: r.url != null ? String(r.url) : undefined,
  };
}

function rowToField(r: Record<string, unknown>) {
  return { id: String(r.id), name: String(r.name ?? ""), value: String(r.value ?? "") };
}

function rowToNoteEntry(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    date: String(r.date ?? ""),
    heading: String(r.heading ?? ""),
    subheading: String(r.subheading ?? ""),
    content: String(r.content ?? ""),
  };
}

function rowToFolder(r: Record<string, unknown>, files: FolderFile[]): Folder {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: (r.type as Folder["type"]) ?? "general",
    files,
  };
}

function rowToProject(
  r: Record<string, unknown>,
  fields: { id: string; name: string; value: string }[],
  folders: Folder[],
  noteEntries: { id: string; date: string; heading: string; subheading: string; content: string }[]
): Project {
  return {
    id: String(r.id),
    projectNumber: r.project_number != null ? String(r.project_number) : undefined,
    name: String(r.name ?? ""),
    status: (r.status as Project["status"]) ?? "Live",
    dateCreated: String(r.date_created ?? ""),
    completedDate: r.completed_date != null ? String(r.completed_date) : undefined,
    description: r.description != null ? String(r.description) : undefined,
    fields,
    folders,
    notes: String(r.notes ?? ""),
    noteEntries,
  };
}

function rowToClientFile(r: Record<string, unknown>, projects: Project[]): ClientFile {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: (r.type as ClientFile["type"]) ?? "Individual",
    phone: r.phone != null ? String(r.phone) : undefined,
    email: r.email != null ? String(r.email) : undefined,
    idNumber: r.id_number != null ? String(r.id_number) : undefined,
    reference: r.reference != null ? String(r.reference) : undefined,
    dateCreated: String(r.date_created ?? ""),
    lastUpdated: String(r.last_updated ?? ""),
    projects,
    shared: Boolean(r.shared),
  };
}

async function fetchFileById(clientFileId: string): Promise<ClientFile | null> {
  const { data: fileRow, error: fileErr } = await supabase
    .from("client_files")
    .select("*")
    .eq("id", clientFileId)
    .maybeSingle();
  if (fileErr || !fileRow) return null;
  const f = fileRow as Record<string, unknown>;

  const { data: projectRows } = await supabase.from("projects").select("*").eq("client_file_id", clientFileId);
  const projectsList = (projectRows ?? []) as Record<string, unknown>[];
  const projectIds = projectsList.map((r) => String(r.id));

  if (projectIds.length === 0) {
    return rowToClientFile(f, []);
  }

  const [fieldsRes, foldersRes, noteEntriesRes] = await Promise.all([
    supabase.from("fields").select("*").in("project_id", projectIds),
    supabase.from("folders").select("*").in("project_id", projectIds),
    supabase.from("note_entries").select("*").in("project_id", projectIds),
  ]);

  const folderRows = (foldersRes.data ?? []) as Record<string, unknown>[];
  const folderIds = folderRows.map((r) => String(r.id));
  const folderFilesRes = folderIds.length
    ? await supabase.from("folder_files").select("*").in("folder_id", folderIds)
    : { data: [] as Record<string, unknown>[] };
  const folderFileRows = (folderFilesRes.data ?? []) as Record<string, unknown>[];

  const fieldsByProject = new Map<string, { id: string; name: string; value: string }[]>();
  ((fieldsRes.data ?? []) as Record<string, unknown>[]).forEach((r) => {
    const pid = String(r.project_id);
    if (!fieldsByProject.has(pid)) fieldsByProject.set(pid, []);
    fieldsByProject.get(pid)!.push(rowToField(r));
  });
  const folderFilesByFolder = new Map<string, FolderFile[]>();
  folderFileRows.forEach((r) => {
    const fid = String(r.folder_id);
    if (!folderFilesByFolder.has(fid)) folderFilesByFolder.set(fid, []);
    folderFilesByFolder.get(fid)!.push(rowToFolderFile(r));
  });
  const foldersByProject = new Map<string, Folder[]>();
  folderRows.forEach((r) => {
    const pid = String(r.project_id);
    const filesList = folderFilesByFolder.get(String(r.id)) ?? [];
    foldersByProject.set(pid, [...(foldersByProject.get(pid) ?? []), rowToFolder(r, filesList)]);
  });
  const noteEntriesByProject = new Map<string, { id: string; date: string; heading: string; subheading: string; content: string }[]>();
  ((noteEntriesRes.data ?? []) as Record<string, unknown>[]).forEach((r) => {
    const pid = String(r.project_id);
    if (!noteEntriesByProject.has(pid)) noteEntriesByProject.set(pid, []);
    noteEntriesByProject.get(pid)!.push(rowToNoteEntry(r));
  });

  const projects: Project[] = projectsList.map((r) =>
    rowToProject(
      r,
      fieldsByProject.get(String(r.id)) ?? [],
      foldersByProject.get(String(r.id)) ?? [],
      noteEntriesByProject.get(String(r.id)) ?? []
    )
  );
  return rowToClientFile(f, projects);
}

export default function ClientPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { files: contextFiles, loading: dataLoading } = useData();
  const [share, setShare] = useState<ShareRow | null>(null);
  const [shareLoading, setShareLoading] = useState(true);
  const [fetchedFile, setFetchedFile] = useState<ClientFile | null>(null);
  const [openFolder, setOpenFolder] = useState<{ projectIndex: number; folderId: string } | null>(null);
  const [viewingFile, setViewingFile] = useState<{ name: string; url: string; fileType: FolderFile["fileType"] } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [codeError, setCodeError] = useState("");

  const loadShare = useCallback(async (t: string) => {
    setShareLoading(true);
    try {
      const { data, error } = await supabase
        .from("shares")
        .select("code, project_ids, folder_ids, client_file_id")
        .eq("token", t)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) {
        setShare(null);
        return;
      }
      setShare(data as ShareRow);
    } catch (err) {
      setShare(null);
      toast.error(mapSupabaseError(err));
    } finally {
      setShareLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    loadShare(token);
  }, [token, loadShare]);

  useEffect(() => {
    if (!share?.client_file_id || codeVerified) return;
    let cancelled = false;
    fetchFileById(share.client_file_id)
      .then((file) => {
        if (!cancelled) setFetchedFile(file);
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchedFile(null);
          toast.error(mapSupabaseError(err));
        }
      });
    return () => { cancelled = true; };
  }, [share?.client_file_id, codeVerified]);

  const fileFromContext = token
    ? contextFiles.find((f) => (f.reference && f.reference === token) || f.id === token)
    : undefined;
  const file = fileFromContext ?? (codeVerified ? fetchedFile : null);

  const handleCodeSubmit = () => {
    if (attempts >= 3) return;
    const expected = share?.code;
    const entered = codeInput.trim();
    if (expected != null && entered === expected) {
      setCodeVerified(true);
      setCodeError("");
      if (!fileFromContext && share?.client_file_id) {
        fetchFileById(share.client_file_id).then(setFetchedFile);
      }
    } else {
      setAttempts((a) => a + 1);
      setCodeError("Incorrect code. Please check and try again.");
      if (attempts + 1 >= 3) {
        setCodeError("Too many attempts. Please contact the person who shared this file with you.");
      }
    }
  };

  const locked = attempts >= 3;

  if (!token) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">This link is not valid or has expired.</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Please contact the business that shared it with you.
          </p>
          <Link to="/" className="text-primary font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </PublicBrandLayout>
    );
  }

  if (shareLoading) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">Loading…</h1>
          <div className="animate-pulse rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto" />
        </div>
      </PublicBrandLayout>
    );
  }

  if (share === null) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">This link is not valid or has expired.</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Please contact the business that shared it with you.
          </p>
          <Link to="/" className="text-primary font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </PublicBrandLayout>
    );
  }

  if (!codeVerified) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md">
          <div className="space-y-2 text-center lg:text-left mb-6">
            <h1 className="text-2xl font-bold text-foreground">View Your Shared File</h1>
            <p className="text-muted-foreground text-sm">Enter the access code you received to view shared content.</p>
          </div>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCodeSubmit();
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Enter your access code e.g. STOR-4821"
                disabled={locked}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              />
              {codeError && (
                <p className="text-sm text-destructive" role="alert">{codeError}</p>
              )}
              <button
                type="submit"
                disabled={locked}
                className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium disabled:opacity-50 disabled:pointer-events-none transition-colors min-h-[44px]"
              >
                View My File
              </button>
            </form>
          </div>
        </div>
      </PublicBrandLayout>
    );
  }

  if (dataLoading) {
    return (
      <PublicBrandLayout>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border bg-card">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-center gap-3">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-7 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </header>
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              <span>Loading shared content…</span>
            </div>
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="h-5 w-3/4 bg-muted rounded mb-3" />
                <div className="h-4 w-full bg-muted/80 rounded mb-2" />
                <div className="h-4 w-2/3 bg-muted/80 rounded" />
              </div>
              <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="h-5 w-1/2 bg-muted rounded mb-3" />
                <div className="h-4 w-full bg-muted/80 rounded" />
              </div>
            </div>
          </div>
        </div>
      </PublicBrandLayout>
    );
  }

  if (!file) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading shared file…</p>
          </div>
        </div>
      </PublicBrandLayout>
    );
  }

  const statusVariant = (s: string) =>
    s === "Live" ? "live" : s === "Pending" ? "pending" : "completed";

  const sharedProjectIds: string[] =
    share != null && Array.isArray(share.project_ids) ? share.project_ids : file.projects.map((p) => p.id);
  const sharedFolderIds: string[] =
    share != null && Array.isArray(share.folder_ids) ? share.folder_ids : file.projects.flatMap((p) => p.folders.map((f) => f.id));

  const sharedProjects = file.projects.filter((p) => sharedProjectIds.includes(p.id));

  if (sharedProjects.length === 0) {
    return (
      <PublicBrandLayout>
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-3">No content has been shared in this link.</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Please contact the business that shared it with you.
          </p>
          <Link to="/" className="text-primary font-medium hover:underline">
            Go to Homepage
          </Link>
        </div>
      </PublicBrandLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{file.name}</h1>
              <Badge variant="outline" className="text-muted-foreground">
                Shared view
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-8 text-sm text-blue-900 space-y-1">
          <p>This is a read-only view. You can view all shared information and open or download any file. You cannot make changes.</p>
          <p className="text-xs text-blue-700">
            Powered by <BrandName className="text-blue-800" /> — {BRAND_TAGLINE}
          </p>
        </div>

        <div className="space-y-8">
          {sharedProjects.map((project: Project, projectIndex: number) => {
            const sharedFoldersInProject = project.folders.filter((f) =>
              sharedFolderIds.includes(f.id)
            );
            return (
              <div
                key={project.id}
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {project.name}
                  </h2>
                  <span className="text-sm text-muted-foreground font-mono">
                    {project.projectNumber || project.id}
                  </span>
                  <Badge variant={statusVariant(project.status)}>
                    {project.status}
                  </Badge>
                </div>

                {project.fields.length > 0 && (
                  <div className="mb-6">
                    <div className="border border-border rounded-lg overflow-hidden">
                      {project.fields.map((field) => (
                        <div
                          key={field.id}
                          className="flex border-b border-border last:border-0"
                        >
                          <div className="flex-1 px-4 py-3 text-sm text-muted-foreground border-r border-border">
                            {field.name}
                          </div>
                          <div className="flex-1 px-4 py-3 text-sm font-medium text-foreground">
                            {field.value || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sharedFoldersInProject.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {sharedFoldersInProject.map((folder: Folder) => (
                      <button
                        type="button"
                        key={folder.id}
                        onClick={() =>
                          setOpenFolder(
                            openFolder?.folderId === folder.id &&
                              openFolder?.projectIndex === projectIndex
                              ? null
                              : { projectIndex, folderId: folder.id }
                          )
                        }
                        className="bg-muted/30 border border-border rounded-xl p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <FolderOpen className="h-5 w-5 text-muted-foreground mb-2" />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-medium text-foreground text-sm">
                            {folder.name}
                          </p>
                          <Badge variant="secondary" className="text-xs font-normal text-muted-foreground bg-muted">
                            View only
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {folder.files.length} files
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No folders shared for this project.
                  </p>
                )}

                {openFolder?.projectIndex === projectIndex &&
                  (() => {
                    const folder = project.folders.find(
                      (f) => f.id === openFolder.folderId
                    );
                    if (!folder) return null;
                    return (
                      <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <p className="text-sm font-medium text-foreground">
                            {folder.name} — files
                          </p>
                          <Badge variant="secondary" className="text-xs font-normal text-muted-foreground bg-muted">
                            View only
                          </Badge>
                        </div>
                        <ul className="space-y-2">
                          {folder.files.map((f) => (
                            <li
                              key={f.id}
                              className="flex flex-wrap items-center gap-2 text-sm text-foreground"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="flex-1 min-w-0 truncate">{f.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">View only</span>
                              {f.url ? (
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setViewingFile({ name: f.name, url: f.url!, fileType: f.fileType })}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-primary text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    View
                                  </button>
                                  <a
                                    href={f.url}
                                    download={f.name}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </a>
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground shrink-0">Preview not available</span>
                              )}
                            </li>
                          ))}
                          {folder.files.length === 0 && (
                            <li className="text-sm text-muted-foreground">
                              No files
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        <footer className="mt-12 pt-8 border-t border-border text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Shared securely via Lunex — lunexweb.com
          </p>
          <p className="text-xs text-muted-foreground">{BRAND_TAGLINE}</p>
        </footer>
      </div>

      {viewingFile && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="View file"
          onClick={() => setViewingFile(null)}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-card border-b border-border shrink-0" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium text-foreground truncate min-w-0">{viewingFile.name}</p>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={viewingFile.url}
                download={viewingFile.name}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-primary text-primary hover:bg-primary/10"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <button
                type="button"
                onClick={() => setViewingFile(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 rounded-lg border border-border hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto" onClick={(e) => e.stopPropagation()}>
            {viewingFile.fileType === "image" || viewingFile.url.startsWith("data:image/") ? (
              <img
                src={viewingFile.url}
                alt={viewingFile.name}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded"
              />
            ) : viewingFile.fileType === "video" || viewingFile.url.startsWith("data:video/") ? (
              <video
                src={viewingFile.url}
                controls
                className="max-w-full max-h-[85vh] rounded"
                title={viewingFile.name}
              />
            ) : (
              <iframe
                src={viewingFile.url}
                title={viewingFile.name}
                className="w-full max-w-4xl h-[85vh] border-0 rounded bg-white"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
