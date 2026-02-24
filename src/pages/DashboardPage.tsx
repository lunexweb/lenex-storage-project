import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Search, Clock, FileText, FolderOpen, User, Plus, Folder, Cloud, Share2, Upload, Database, Loader2, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import type { FormSubmissionRow } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { getFileStats, type ClientFile, type Project } from "@/data/mockData";
import { calculateTotalStorageBytes, formatStorageSize } from "@/lib/utils";
import CreateFileModal from "@/components/modals/CreateFileModal";
import ImportCSVModal from "@/components/modals/ImportCSVModal";
import { BrandName } from "@/components/BrandName";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const today = () =>
  new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function DashboardPage() {
  const { files, activities, templates, loading, getFormSubmissions } = useData();
  const { user } = useAuth();
  const { profile } = useSettings();
  const displayName = profile.businessNameOrUserName?.trim() || user?.name || "";
  const greetingLine = displayName ? `${greeting()}, ${displayName}` : "Welcome to Lunex.com";
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState<{ templateId: string; templateName: string; submission: FormSubmissionRow }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!templates.length) return;
    const shareable = templates.filter((t) => t.isShareable);
    if (!shareable.length) {
      setPendingSubmissions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const all: { templateId: string; templateName: string; submission: FormSubmissionRow }[] = [];
      for (const t of shareable) {
        try {
          const list = await getFormSubmissions(t.id);
          const pending = list.filter((s) => s.status === "pending");
          pending.forEach((s) => all.push({ templateId: t.id, templateName: t.name, submission: s }));
        } catch {
          // ignore
        }
      }
      if (!cancelled) setPendingSubmissions(all);
    })();
    return () => { cancelled = true; };
  }, [templates, getFormSubmissions]);

  const stats = useMemo(() => getFileStats(files ?? []), [files]);
  const totalStorageBytes = useMemo(() => calculateTotalStorageBytes(files ?? []), [files]);
  const storageFormatted = useMemo(() => formatStorageSize(totalStorageBytes), [totalStorageBytes]);

  type SearchHit = { type: "file"; file: ClientFile } | { type: "project"; file: ClientFile; project: Project };

  const searchResults = useMemo((): SearchHit[] => {
    if (!quickSearch.trim()) return [];
    const q = quickSearch.toLowerCase();
    const fileMatches = (f: ClientFile) =>
      f.name.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      (f.reference && f.reference.toLowerCase().includes(q)) ||
      (f.phone && f.phone.includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q));
    const projectMatches = (p: Project) =>
      p.id.toLowerCase().includes(q) ||
      (p.projectNumber && p.projectNumber.toLowerCase().includes(q)) ||
      p.name.toLowerCase().includes(q);

    const out: SearchHit[] = [];
    const seenFileIds = new Set<string>();
    const fileList = files ?? [];
    for (const f of fileList) {
      if (fileMatches(f) && !seenFileIds.has(f.id)) {
        seenFileIds.add(f.id);
        out.push({ type: "file", file: f });
      }
    }
    for (const f of fileList) {
      for (const p of f.projects ?? []) {
        if (projectMatches(p)) {
          out.push({ type: "project", file: f, project: p });
        }
      }
    }
    return out.slice(0, 8);
  }, [files, quickSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const statCards = [
    { label: "Total Files", value: files.length, color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" },
    { label: "Live Projects", value: stats.live, color: "text-success", bg: "bg-success/5", border: "border-success/10" },
    { label: "Pending Projects", value: stats.pending, color: "text-warning", bg: "bg-warning/5", border: "border-warning/10" },
    { label: "Completed Projects", value: stats.completed, color: "text-completed", bg: "bg-completed/5", border: "border-completed/10" },
    { label: "Storage Used", value: storageFormatted, color: "text-[#7C3AED]", bg: "bg-[#EDE9FE]", border: "border-[#7C3AED]/20", icon: Database },
  ];

  const emptyStatCards = [
    { label: "Total Files", value: 0, color: "text-primary", bg: "bg-primary/5", border: "border-primary/10" },
    { label: "Live Projects", value: 0, color: "text-success", bg: "bg-success/5", border: "border-success/10" },
    { label: "Pending Projects", value: 0, color: "text-warning", bg: "bg-warning/5", border: "border-warning/10" },
    { label: "Completed Projects", value: 0, color: "text-completed", bg: "bg-completed/5", border: "border-completed/10" },
    { label: "Storage Used", value: "0 B", color: "text-[#7C3AED]", bg: "bg-[#EDE9FE]", border: "border-[#7C3AED]/20", icon: Database },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{greetingLine}</h1>
          <p className="text-muted-foreground mt-1">{today()}</p>
        </div>
        <Button variant="gold" size="sm" onClick={() => setShowCreate(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-1" /> Create file
        </Button>
      </div>

      {loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading your data…</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-muted/30 border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-8 w-1/2 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="h-12 bg-muted/30 rounded-xl mb-8 animate-pulse w-full" />
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="h-14 px-5 border-b border-border flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && files.length === 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {emptyStatCards.map((s) => (
              <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-5`}>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                  {"icon" in s && s.icon ? <s.icon className="h-3.5 w-3.5" /> : null}
                  {s.label}
                </p>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-card rounded-xl border border-border text-center max-w-2xl mx-auto shadow-sm">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
              <FolderOpen className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to <BrandName /></h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              Your dashboard is ready. Create your first client file or import from CSV/Excel to get started.
            </p>
            <div className="flex flex-nowrap items-center justify-center gap-3">
              <Button variant="gold" size="lg" onClick={() => setShowCreate(true)} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Create your first file
              </Button>
              <Button variant="outline" size="lg" onClick={() => setShowImportModal(true)} className="shrink-0">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV / Excel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-8 mb-4 font-medium uppercase tracking-wider">What you can do</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center hover:border-primary/20 transition-colors">
                <Folder className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">Organise</p>
                <p className="text-xs text-muted-foreground">All client info and projects in one place.</p>
              </div>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center hover:border-primary/20 transition-colors">
                <Cloud className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">Store</p>
                <p className="text-xs text-muted-foreground">Files stored securely with your account.</p>
              </div>
              <div className="bg-muted/30 border border-border rounded-xl p-4 text-center hover:border-primary/20 transition-colors">
                <Share2 className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">Share</p>
                <p className="text-xs text-muted-foreground">Share selected projects or folders with clients.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && files.length > 0 && (
        <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className={`${s.bg} ${s.border} border rounded-xl p-5`}>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              {"icon" in s && s.icon ? <s.icon className="h-3.5 w-3.5" /> : null}
              {s.label}
            </p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div ref={searchRef} className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={quickSearch}
          onChange={(e) => {
            setQuickSearch(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Quick search — file name, ID, reference, phone, or project number"
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        {showResults && quickSearch.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">No results found.</div>
            ) : (
              searchResults.map((hit, idx) =>
                hit.type === "file" ? (
                  <button
                    type="button"
                    key={`file-${hit.file.id}`}
                    onClick={() => {
                      navigate(`/file/${hit.file.id}`);
                      setShowResults(false);
                      setQuickSearch("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border last:border-b-0"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {hit.file.type === "Business" ? <FolderOpen className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{hit.file.name}</p>
                      <p className="text-xs text-muted-foreground">File · {hit.file.type} · {hit.file.projects.length} projects</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{hit.file.lastUpdated}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    key={`project-${hit.file.id}-${hit.project.id}`}
                    onClick={() => {
                      navigate(`/file/${hit.file.id}/project/${hit.project.id}`);
                      setShowResults(false);
                      setQuickSearch("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border last:border-b-0"
                  >
                    <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{hit.project.name}</p>
                      <p className="text-xs text-muted-foreground">Project · {hit.file.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{hit.project.status}</span>
                  </button>
                )
              )
            )}
          </div>
        )}
      </div>

      {activities.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
          </div>
          <div className="divide-y divide-border">
            {activities.map((edit) => {
              let timeAgo = edit.time;
              if (edit.createdAt) {
                try {
                  const then = parseISO(edit.createdAt).getTime();
                  if ((Date.now() - then) / 1000 < 60) timeAgo = "Just now";
                  else timeAgo = formatDistanceToNow(parseISO(edit.createdAt), { addSuffix: true });
                } catch {
                  // keep edit.time
                }
              }
              return (
                <div
                  key={edit.id}
                  className="px-4 py-3 flex gap-3 hover:bg-muted/20 transition-colors cursor-pointer min-h-[44px] items-start sm:items-center"
                  onClick={() => edit.fileId && navigate(`/file/${edit.fileId}`)}
                >
                  <div className="h-8 w-8 max-lg:h-11 max-lg:w-11 max-lg:min-h-[44px] max-lg:min-w-[44px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {edit.action.charAt(0)}{edit.target.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground break-words">
                      <span className="text-muted-foreground">{edit.action}</span>{" "}
                      <span className="font-medium">{edit.target}</span>
                    </p>
                    <span className="text-xs text-muted-foreground mt-0.5 block">{timeAgo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendingSubmissions.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden mt-6">
          <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-muted-foreground shrink-0" />
            <h2 className="text-base font-semibold text-foreground">Form Submissions</h2>
          </div>
          <div className="divide-y divide-border">
            {pendingSubmissions.map(({ templateId, templateName, submission }) => (
              <div
                key={submission.id}
                className="px-4 py-3 flex flex-wrap items-center gap-3 min-h-[44px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{templateName}</p>
                  <p className="text-xs text-muted-foreground">
                    {submission.submitter_name || submission.submitter_email || "—"} · {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/templates", { state: { openSubmissionsForTemplateId: templateId } })}
                >
                  Import
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {showCreate && <CreateFileModal onClose={() => setShowCreate(false)} />}
      {showImportModal && <ImportCSVModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
