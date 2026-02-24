import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, FileText, Image, Video, Plus, Upload, FolderOpen, Trash2, Share2, ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { getFileDocCounts } from "@/data/mockData";
import { generateFilePDF } from "@/lib/generatePDF";
import CreateFileModal from "@/components/modals/CreateFileModal";
import ShareModal from "@/components/modals/ShareModal";
import ImportCSVModal from "@/components/modals/ImportCSVModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import { toast } from "sonner";

type FilterType = "All" | "Business" | "Individual" | "Live" | "Pending" | "Completed" | "Shared";

export default function FilesPage() {
  const { files, deleteFile, loading } = useData();
  const { profile } = useSettings();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fileList = files ?? [];
  const filterCounts = useMemo(() => {
    const c = { All: fileList.length, Business: 0, Individual: 0, Live: 0, Pending: 0, Completed: 0, Shared: 0 };
    fileList.forEach((f) => {
      c[f.type]++;
      if (f.shared) c.Shared++;
      if ((f.projects ?? []).some((p) => p.status === "Live")) c.Live++;
      if ((f.projects ?? []).some((p) => p.status === "Pending")) c.Pending++;
      if ((f.projects ?? []).some((p) => p.status === "Completed")) c.Completed++;
    });
    return c;
  }, [files]);

  const filtered = useMemo(() => {
    let result = fileList;
    if (filter === "Business") result = result.filter((f) => f.type === "Business");
    else if (filter === "Individual") result = result.filter((f) => f.type === "Individual");
    else if (filter === "Live") result = result.filter((f) => (f.projects ?? []).some((p) => p.status === "Live"));
    else if (filter === "Pending") result = result.filter((f) => (f.projects ?? []).some((p) => p.status === "Pending"));
    else if (filter === "Completed") result = result.filter((f) => (f.projects ?? []).some((p) => p.status === "Completed"));
    else if (filter === "Shared") result = result.filter((f) => f.shared);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          (f.reference && f.reference.toLowerCase().includes(q)) ||
          (f.phone && f.phone.includes(q)) ||
          (f.email && f.email.toLowerCase().includes(q)) ||
          (f.projects ?? []).some(
            (p) =>
              p.id.toLowerCase().includes(q) ||
              (p.projectNumber && p.projectNumber.toLowerCase().includes(q)) ||
              p.name.toLowerCase().includes(q)
          )
      );
    }
    return result;
  }, [files, filter, search]);

  const selectedInFiltered = useMemo(
    () => filtered.filter((f) => selectedIds.has(f.id)),
    [filtered, selectedIds]
  );
  const selectedCount = selectedInFiltered.length;
  const allFilteredSelected = filtered.length > 0 && selectedCount === filtered.length;
  const someFilteredSelected = selectedCount > 0;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    (el as HTMLInputElement & { indeterminate: boolean }).indeterminate =
      someFilteredSelected && !allFilteredSelected;
  }, [someFilteredSelected, allFilteredSelected]);

  const highlightText = (text: string) => {
    if (!search.trim()) return text;
    const idx = text.toLowerCase().indexOf(search.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-gold/20 text-foreground rounded px-0.5">{text.slice(idx, idx + search.length)}</mark>
        {text.slice(idx + search.length)}
      </>
    );
  };

  const filters: FilterType[] = ["All", "Business", "Individual", "Live", "Pending", "Completed", "Shared"];

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((f) => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((f) => next.add(f.id));
        return next;
      });
    }
  };

  const toggleOne = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDeleteConfirm = () => {
    selectedInFiltered.forEach((f) => deleteFile(f.id));
    setSelectedIds(new Set());
    setShowBulkDeleteModal(false);
  };

  const handleDownloadFile = async (file: (typeof files)[0]) => {
    try {
      await generateFilePDF(file, {
        projectIds: file.projects.map((p) => p.id),
        businessName: profile.businessNameOrUserName?.trim(),
      });
    } catch (err) {
      const msg =
        err && typeof (err as { code?: string }).code === "string" && (err as { code: string }).code === "MODULE_NOT_FOUND"
          ? "PDF download requires: npm install jspdf jspdf-autotable"
          : "PDF download failed. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Files</h1>
          <p className="text-muted-foreground text-sm mt-1">All your client files in one place</p>
          {!loading && files.length > 0 && (
            <p className="text-muted-foreground text-xs mt-0.5">Select one or more files with the checkboxes to delete or share in bulk.</p>
          )}
        </div>
      </div>

      {loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading files…</span>
          </div>
          <div className="h-12 bg-muted/30 rounded-xl mb-4 animate-pulse w-full" />
          <div className="flex flex-wrap gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-9 w-24 bg-muted/30 rounded-md animate-pulse" />
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="border-b border-border">
              <div className="h-12 px-4 flex items-center gap-3">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="h-4 flex-1 max-w-xs bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 px-4 flex items-center gap-3">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse shrink-0" />
                  <div className="h-5 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-card rounded-xl border border-border text-center max-w-2xl mx-auto shadow-sm">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 ring-4 ring-primary/5">
            <FolderOpen className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No files yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            Create your first client file or import from CSV/Excel. Each file can hold multiple projects and folders.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="gold" size="lg" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create new file
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV / Excel
            </Button>
          </div>
        </div>
      )}

      {!loading && files.length > 0 && (
        <>
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search any file by name, ID, or phone number"
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div className="flex flex-col gap-4 mb-4 max-lg:gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h-[44px] px-4 py-2 max-lg:px-3 max-lg:py-2.5 rounded-lg text-sm font-medium transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {f} <span className="opacity-70">({filterCounts[f]})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] max-lg:flex-1 max-lg:min-w-0"
            onClick={() => setShowImportModal(true)}
          >
            <Upload className="h-4 w-4 mr-1 shrink-0" /> <span className="truncate">Import CSV / Excel</span>
          </Button>
          <Button variant="gold" size="sm" className="min-h-[44px] max-lg:flex-1 max-lg:min-w-0" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1 shrink-0" /> <span className="truncate">Create New File</span>
          </Button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} file{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const first = selectedInFiltered[0];
                if (first) setShareFileId(first.id);
              }}
            >
              <Share2 className="h-4 w-4 mr-1" /> Share selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete selected
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden max-w-full">
        <div className="overflow-x-auto max-w-full" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 px-2 py-3">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all files"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="text-left font-semibold px-4 py-3 text-muted-foreground">File Name</th>
                <th className="text-left font-semibold px-3 py-3 text-muted-foreground">Type</th>
                <th className="text-center font-semibold px-3 py-3 text-success">Live</th>
                <th className="text-center font-semibold px-3 py-3 text-warning">Pending</th>
                <th className="text-center font-semibold px-3 py-3 text-completed">Completed</th>
                <th className="text-center font-semibold px-3 py-3 text-muted-foreground">
                  <FileText className="h-4 w-4 mx-auto" />
                </th>
                <th className="text-center font-semibold px-3 py-3 text-muted-foreground">
                  <Image className="h-4 w-4 mx-auto" />
                </th>
                <th className="text-center font-semibold px-3 py-3 text-muted-foreground">
                  <Video className="h-4 w-4 mx-auto" />
                </th>
                <th className="text-left font-semibold px-3 py-3 text-muted-foreground">Updated</th>
                <th className="text-right font-semibold px-4 py-3 text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => {
                const counts = getFileDocCounts(file);
                const live = file.projects.filter((p) => p.status === "Live").length;
                const pending = file.projects.filter((p) => p.status === "Pending").length;
                const completed = file.projects.filter((p) => p.status === "Completed").length;
                return (
                  <tr
                    key={file.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={() => toggleOne(file.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${file.name}`}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{highlightText(file.name)}</td>
                    <td className="px-3 py-3">
                      <Badge variant={file.type === "Business" ? "business" : "individual"}>{file.type}</Badge>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-success">{live || "—"}</td>
                    <td className="px-3 py-3 text-center font-semibold text-warning">{pending || "—"}</td>
                    <td className="px-3 py-3 text-center font-semibold text-completed">{completed || "—"}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{counts.docs}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{counts.images}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{counts.videos}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{file.lastUpdated}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="default" onClick={() => navigate(`/file/${file.id}`)}>
                          Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShareFileId(file.id)}>
                          Share
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadFile(file)} title="Download as PDF">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-muted-foreground">
                    No files match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {showCreate && <CreateFileModal onClose={() => setShowCreate(false)} />}
      {shareFileId && <ShareModal fileId={shareFileId} onClose={() => setShareFileId(null)} />}
      {showImportModal && (
        <ImportCSVModal onClose={() => setShowImportModal(false)} />
      )}
      {showBulkDeleteModal && (
        <DeleteConfirmModal
          title="Delete Files"
          itemName={selectedCount === 1 ? selectedInFiltered[0]?.name ?? "file" : `${selectedCount} files`}
          confirmPhrase={selectedCount === 1 ? "Yes, delete this file" : "Yes, delete these files"}
          isOpen={showBulkDeleteModal}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}
    </div>
  );
}
