import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Lock,
  Loader2,
  Pencil,
  Trash2,
  Plus,
  Wand2,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Upload,
  ArrowLeft,
  ArrowRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Calendar,
  Link2,
  Check,
  List,
  MoreVertical,
  Eye,
  FolderInput,
  CheckSquare,
  Square,
  Play,
  File as FileIcon,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { getProjectStats } from "@/data/mockData";
import { Switch } from "@/components/ui/switch";
import ShareModal from "@/components/modals/ShareModal";
import ShareFileModal from "@/components/modals/ShareFileModal";
import ShareNoteModal from "@/components/modals/ShareNoteModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import CompleteConfirmModal from "@/components/modals/CompleteConfirmModal";
import RequestFilesModal from "@/components/modals/RequestFilesModal";
import type { StoredRequest } from "@/components/modals/RequestFilesModal";
import type { NoteEntry, FolderFile, Folder } from "@/data/mockData";
import { formatStorageSize, hasProtectedExtension, getBasename, getExtension, preserveExtensionName } from "@/lib/utils";
import { generateFilePDF } from "@/lib/generatePDF";
import { useSettings } from "@/context/SettingsContext";

import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function SafeImage({
  src,
  alt,
  className,
  onErrorRefresh,
}: {
  src: string;
  alt: string;
  className?: string;
  /** When the image fails to load (e.g. expired signed URL), try to get a new URL. If provided and returns a URL, the image will show that instead of the placeholder. */
  onErrorRefresh?: () => Promise<string | null>;
}) {
  const [failed, setFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  useEffect(() => {
    setCurrentSrc(src);
    setFailed(false);
  }, [src]);
  const handleError = useCallback(() => {
    if (onErrorRefresh) {
      onErrorRefresh()
        .then((newUrl) => {
          if (newUrl) {
            setCurrentSrc(newUrl);
          } else {
            setFailed(true);
          }
        })
        .catch(() => setFailed(true));
    } else {
      setFailed(true);
    }
  }, [onErrorRefresh]);
  if (failed) {
    return (
      <div
        className={className}
        style={{ background: "var(--muted)" }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
            {alt}
          </span>
        </div>
      </div>
    );
  }
  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
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
  return c[ft] || c.other;
};

const folderColor = (type: string) => {
  const c: Record<string, string> = {
    documents: "text-primary bg-primary/10",
    photos: "text-success bg-success/10",
    videos: "text-purple-500 bg-purple-50",
    general: "text-muted-foreground bg-muted",
  };
  return c[type] || c.general;
};

const NOTE_META_DEBOUNCE_MS = 700;
const MAX_HEADING_WORDS = 25;

function NoteEntryCard({
  entry,
  isCompleted,
  autoSave,
  contentEditRefs,
  onSave,
  onDelete,
  notesTimer,
  expandedByDefault,
  onShare,
}: {
  entry: NoteEntry;
  isCompleted: boolean;
  autoSave: boolean;
  contentEditRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onSave: (id: string, u: Partial<NoteEntry>) => void;
  onDelete?: () => void;
  notesTimer: React.MutableRefObject<NodeJS.Timeout | undefined>;
  expandedByDefault?: boolean;
  onShare: () => void;
}) {
  const [collapsed, setCollapsed] = useState(!expandedByDefault);
  const [localDate, setLocalDate] = useState(entry.date);
  const [localHeading, setLocalHeading] = useState(entry.heading);
  const [localSubheading, setLocalSubheading] = useState(entry.subheading);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const metaTimerRef = useRef<NodeJS.Timeout>();
  const metaValuesRef = useRef({ date: entry.date, heading: entry.heading, subheading: entry.subheading });
  const savedFeedbackTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (expandedByDefault) setCollapsed(false);
  }, [expandedByDefault]);

  // Sync from server only when we switch to a different note — avoids overwriting what the user is typing after refetch
  useEffect(() => {
    setLocalDate(entry.date);
    setLocalHeading(entry.heading);
    setLocalSubheading(entry.subheading);
    metaValuesRef.current = { date: entry.date, heading: entry.heading, subheading: entry.subheading };
  }, [entry.id]);

  useEffect(() => {
    return () => {
      if (savedFeedbackTimeoutRef.current) clearTimeout(savedFeedbackTimeoutRef.current);
    };
  }, []);

  const flushMetaSave = useCallback(() => {
    if (metaTimerRef.current) {
      clearTimeout(metaTimerRef.current);
      metaTimerRef.current = undefined;
    }
    onSave(entry.id, { ...metaValuesRef.current });
  }, [entry.id, onSave]);

  const scheduleMetaSave = useCallback(() => {
    if (!autoSave) return;
    if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
    metaTimerRef.current = setTimeout(flushMetaSave, NOTE_META_DEBOUNCE_MS);
  }, [autoSave, flushMetaSave]);

  const scheduleSave = useCallback(
    (updates: Partial<NoteEntry>) => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
      if (autoSave) {
        notesTimer.current = setTimeout(() => onSave(entry.id, updates), 1500);
      }
    },
    [autoSave, entry.id, onSave, notesTimer]
  );

  const handleContentBlur = useCallback(() => {
    const el = contentEditRefs.current.get(entry.id);
    if (el) onSave(entry.id, { content: el.innerHTML });
  }, [entry.id, onSave, contentEditRefs]);

  const handleSaveNow = useCallback(() => {
    flushMetaSave();
    const el = contentEditRefs.current.get(entry.id);
    const content = el?.innerHTML ?? entry.content;
    onSave(entry.id, { content });
    setSavedFeedback(true);
    if (savedFeedbackTimeoutRef.current) clearTimeout(savedFeedbackTimeoutRef.current);
    savedFeedbackTimeoutRef.current = setTimeout(() => {
      setSavedFeedback(false);
      savedFeedbackTimeoutRef.current = undefined;
    }, 2200);
  }, [entry.id, entry.content, onSave, contentEditRefs, flushMetaSave]);

  const handleFormat = useCallback(
    (command: "bold" | "italic" | "underline") => {
      document.execCommand(command, false);
      const el = contentEditRefs.current.get(entry.id);
      if (el) scheduleSave({ content: el.innerHTML });
    },
    [entry.id, scheduleSave, contentEditRefs]
  );

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        contentEditRefs.current.set(entry.id, el);
        el.innerHTML = entry.content || "";
      }
    },
    [entry.id, entry.content]
  );

  const dateLabel = (() => {
    try {
      return format(parseISO(entry.date), "dd MMM yyyy");
    } catch {
      return entry.date;
    }
  })();
  const preview = [entry.heading, entry.subheading].filter(Boolean).join(" · ") || "No heading";
  const contentPreview = entry.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  const hasContent = (entry.content || "").replace(/<[^>]+>/g, "").trim().length > 0;

  return (
    <div id={`note-${entry.id}`} className="bg-card border border-border rounded-xl overflow-hidden scroll-mt-4">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Click to open note" : "Click to minimize note"}
          aria-label={collapsed ? "Click to open note" : "Click to minimize note"}
          className="flex-1 flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors min-w-0"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-medium text-primary shrink-0">
            {collapsed ? "Click to open" : "Click to minimize"}
          </span>
          <span className="text-sm text-muted-foreground font-mono shrink-0">{dateLabel}</span>
          <span className="flex-1 min-w-0 font-medium text-foreground truncate">{preview || "Untitled note"}</span>
          {collapsed && hasContent && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">
              {contentPreview}
              {contentPreview.length >= 60 ? "…" : ""}
            </span>
          )}
        </button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          title="Share to view (link + code)"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>
      {!collapsed && (
        <div className="px-5 pb-5 pt-4 border-t border-border space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Note date</Label>
              <Input
                type="date"
                value={localDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalDate(v);
                  metaValuesRef.current = { ...metaValuesRef.current, date: v };
                  scheduleMetaSave();
                }}
                onBlur={flushMetaSave}
                disabled={isCompleted}
                className="h-10 w-full min-w-[140px] sm:w-40 rounded-lg border-input bg-muted/30"
                aria-label="Note date"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Heading (up to {MAX_HEADING_WORDS} words)</Label>
                {localHeading.trim() && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {localHeading.trim().split(/\s+/).length} / {MAX_HEADING_WORDS} words
                  </span>
                )}
              </div>
              <textarea
                value={localHeading}
                onChange={(e) => {
                  const v = e.target.value;
                  const wordCount = v.trim() ? v.trim().split(/\s+/).length : 0;
                  if (wordCount <= MAX_HEADING_WORDS) {
                    setLocalHeading(v);
                    metaValuesRef.current = { ...metaValuesRef.current, heading: v };
                    scheduleMetaSave();
                  }
                }}
                onBlur={flushMetaSave}
                placeholder="e.g. Client meeting, Follow-up"
                disabled={isCompleted}
                rows={2}
                spellCheck
                autoCorrect="on"
                autoCapitalize="sentences"
                lang="en"
                className="min-h-[72px] w-full resize-y rounded-lg border border-input bg-muted/30 px-3 py-2.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {!isCompleted && (
              <Button
                type="button"
                size="sm"
                variant={savedFeedback ? "default" : "outline"}
                className={savedFeedback ? "h-10 bg-success text-success-foreground border-success hover:bg-success/90 rounded-lg" : "h-10 rounded-lg shrink-0"}
                onClick={handleSaveNow}
              >
                {savedFeedback ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" aria-hidden />
                    Saved!
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            )}
            {onDelete && !isCompleted && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-10 w-10 shrink-0 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
                title="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Subheading</Label>
            <Input
              value={localSubheading}
              onChange={(e) => {
                const v = e.target.value;
                setLocalSubheading(v);
                metaValuesRef.current = { ...metaValuesRef.current, subheading: v };
                scheduleMetaSave();
              }}
              onBlur={flushMetaSave}
              placeholder="Optional subheading"
              disabled={isCompleted}
              spellCheck
              autoCorrect="on"
              autoCapitalize="sentences"
              lang="en"
              className="rounded-lg border-input bg-muted/30"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Content</Label>
              {!isCompleted && (
                <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
                  <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={() => handleFormat("bold")} title="Bold">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={() => handleFormat("italic")} title="Italic">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-2" onClick={() => handleFormat("underline")} title="Underline">
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div
              ref={setRef}
              contentEditable={!isCompleted}
              suppressContentEditableWarning
              spellCheck
              data-gramm="false"
              data-enable-grammarly="false"
              lang="en"
              onBlur={handleContentBlur}
              onInput={() => {
                const el = contentEditRefs.current.get(entry.id);
                if (el) scheduleSave({ content: el.innerHTML });
              }}
              className="min-h-[120px] w-full rounded-lg border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted/50 leading-relaxed [&_b]:font-bold [&_i]:italic [&_u]:underline"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectPage() {
  const { fileId, projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expandNoteId = searchParams.get("note");
  const {
    files,
    loading,
    updateProject,
    addField,
    updateField,
    deleteField,
    addFolder,
    deleteFolder,
    addFileToFolder,
    syncFolderFiles,
    updateFileInFolder,
    deleteFileFromFolder,
    refreshFileUrl,
    getTotalStorageUsed,
    STORAGE_LIMIT_BYTES,
    setNoteEntries,
    addNoteEntry,
    updateNoteEntry,
    deleteNoteEntry,
    templates,
  } = useData();
  const { profile } = useSettings();

  const file = (files ?? []).find((f) => f.id === fileId);
  const project = (file?.projects ?? []).find((p) => p.id === projectId);

  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderType, setNewFolderType] = useState<Folder["type"]>("general");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [lastSaved, setLastSaved] = useState("Just now");
  const [autoSave, setAutoSave] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [fileInFolderToDelete, setFileInFolderToDelete] = useState<{ folderFileId: string; name: string } | null>(null);
  const [editingFolderFileId, setEditingFolderFileId] = useState<string | null>(null);
  const [editingFolderFileName, setEditingFolderFileName] = useState("");
  const [fieldToDelete, setFieldToDelete] = useState<{ id: string; name: string } | null>(null);
  const [requestFilesFolder, setRequestFilesFolder] = useState<{
    fileId: string;
    projectId: string;
    folderId: string;
    folderName: string;
  } | null>(null);
  const [activeRequestsOpen, setActiveRequestsOpen] = useState(false);
  const [activeRequestsList, setActiveRequestsList] = useState<Array<{ token: string; request: StoredRequest }>>([]);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [viewingFolderFile, setViewingFolderFile] = useState<FolderFile | null>(null);
  const [viewingFileNameEdit, setViewingFileNameEdit] = useState<string | null>(null);
  const [shareFileModal, setShareFileModal] = useState<{
    folderId: string;
    folderFileId: string;
    fileName: string;
  } | null>(null);
  const [shareNoteModal, setShareNoteModal] = useState<{
    noteId: string;
    noteTitle: string;
  } | null>(null);
  const [fileToMove, setFileToMove] = useState<{ folderFile: FolderFile; fromFolderId: string } | null>(null);
  const [selectedFolderFileIds, setSelectedFolderFileIds] = useState<Set<string>>(new Set());
  const [selectedDeleteOpen, setSelectedDeleteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ entryId: string; itemName: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number; done?: boolean } | null>(null);
  const notesTimer = useRef<NodeJS.Timeout>();
  const contentEditRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridFileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingFilesRef = useRef(false);
  const uploadProgressClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameEdit, setProjectNameEdit] = useState("");

  const isCompleted = project?.status === "Completed";

  const entries: NoteEntry[] = (project?.noteEntries?.length
    ? project.noteEntries
    : project?.notes
      ? [
          {
            id: "legacy",
            date: new Date().toISOString().slice(0, 10),
            heading: "",
            subheading: "",
            content: project.notes,
          },
        ]
      : []) as NoteEntry[];

  const migratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!project || !fileId || !projectId || migratedRef.current === project.id) return;
    if (project.notes && !(project.noteEntries?.length)) {
      migratedRef.current = project.id;
      setNoteEntries(fileId, projectId, [
        {
          id: "legacy",
          date: new Date().toISOString().slice(0, 10),
          heading: "",
          subheading: "",
          content: project.notes,
        },
      ]);
    }
  }, [project?.id, project?.notes, project?.noteEntries?.length, fileId, projectId, setNoteEntries]);

  useEffect(() => {
    if (expandNoteId) {
      const el = document.getElementById(`note-${expandNoteId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandNoteId]);

  const currentFolderForLightbox = project?.folders.find((f) => f.id === openFolder);
  const imageFilesInFolder = currentFolderForLightbox
    ? currentFolderForLightbox.files.filter(
        (file) =>
          file.fileType === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
      )
    : [];
  useEffect(() => {
    if (!lightboxOpen || imageFilesInFolder.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i === 0 ? imageFilesInFolder.length - 1 : i - 1));
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i === imageFilesInFolder.length - 1 ? 0 : i + 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, imageFilesInFolder.length]);

  const saveEntry = useCallback(
    (entryId: string, updates: Partial<NoteEntry>) => {
      if (fileId && projectId) {
        updateNoteEntry(fileId, projectId, entryId, updates);
        setLastSaved("Just now");
      }
    },
    [fileId, projectId, updateNoteEntry]
  );

  const handleAddDailyNote = useCallback(() => {
    if (!fileId || !projectId) return;
    const today = new Date().toISOString().slice(0, 10);
    addNoteEntry(fileId, projectId, {
      id: `note-${Date.now()}`,
      date: today,
      heading: "",
      subheading: "",
      content: "",
    });
    toast.success("Daily note added.");
  }, [fileId, projectId, addNoteEntry]);

  const handleDownloadProjectPDF = useCallback(async () => {
    if (!file || !project) return;
    try {
      await generateFilePDF(file, {
        projectIds: [project.id],
        businessName: profile.businessNameOrUserName?.trim(),
      });
      toast.success("PDF downloaded.");
    } catch (err) {
      const msg =
        err && typeof (err as { code?: string }).code === "string" && (err as { code: string }).code === "MODULE_NOT_FOUND"
          ? "PDF download requires: npm install jspdf jspdf-autotable"
          : "PDF download failed. Please try again.";
      toast.error(msg);
    }
  }, [file, project, profile.businessNameOrUserName]);

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    addField(file.id, project.id, { id: `f-${Date.now()}`, name: newFieldName, value: newFieldValue });
    setNewFieldName("");
    setNewFieldValue("");
  };

  const handleSaveEdit = () => {
    if (editingFieldId) {
      updateField(file.id, project.id, editingFieldId, { name: editName, value: editValue });
      setEditingFieldId(null);
    }
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;
    tmpl.fields.forEach((fname, i) => {
      addField(file.id, project.id, { id: `tf-${Date.now()}-${i}`, name: fname, value: "" });
    });
    tmpl.folders.forEach((fo, i) => {
      addFolder(file.id, project.id, { id: `tfo-${Date.now()}-${i}`, name: fo.name, type: fo.type, files: [] });
    });
    const parts = [];
    if (tmpl.fields.length) parts.push(`${tmpl.fields.length} fields`);
    if (tmpl.folders.length) parts.push(`${tmpl.folders.length} folders`);
    toast.success(`${parts.join(" and ")} added from ${tmpl.name}`);
  };

  const FOLDER_TYPES: { value: Folder["type"]; label: string }[] = [
    { value: "documents", label: "Documents" },
    { value: "photos", label: "Photos" },
    { value: "videos", label: "Videos" },
    { value: "general", label: "General" },
  ];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(file.id, project.id, { id: `fo-${Date.now()}`, name: newFolderName.trim(), type: newFolderType, files: [] });
    setNewFolderName("");
    setNewFolderType("general");
    setAddingFolder(false);
  };

  const getFileTypeFromFile = (file: File): FolderFile["fileType"] => {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
    if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
    if (type.includes("video/") || /\.(mp4|webm|mov|avi)$/i.test(name)) return "video";
    if (type.includes("word") || type.includes("document") || /\.(doc|docx)$/i.test(name)) return "word";
    if (type.includes("sheet") || type.includes("excel") || /\.(xls|xlsx|csv)$/i.test(name)) return "excel";
    return "other";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = useCallback(
    async (fileList: FileList | File[] | null, folderId: string) => {
      if (!fileList || fileList.length === 0 || !fileId || !projectId || !folderId) return;
      if (isProcessingFilesRef.current) return;
      const filesArr = Array.from(fileList);
      const totalBatchBytes = filesArr.reduce((sum, f) => sum + (f.size || 0), 0);
      const currentUsed = getTotalStorageUsed();
      if (currentUsed + totalBatchBytes > STORAGE_LIMIT_BYTES) {
        const remaining = Math.max(0, STORAGE_LIMIT_BYTES - currentUsed);
        toast.error(
          `These files would exceed your 100 MB storage limit. You are currently using ${formatStorageSize(currentUsed)}. You can upload ${formatStorageSize(remaining)} more.`
        );
        return;
      }
      isProcessingFilesRef.current = true;
      const folder = (project?.folders ?? []).find((f) => f.id === folderId);
      const existingKeys = new Set(
        (folder?.files ?? []).map((ff) => `${ff.name}|${ff.sizeInBytes ?? 0}`)
      );
      const toAdd: File[] = [];
      for (const f of filesArr) {
        const key = `${f.name}|${f.size}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key);
        toAdd.push(f);
      }
      if (toAdd.length === 0) {
        isProcessingFilesRef.current = false;
        return;
      }
      const total = toAdd.length;
      setUploadProgress({ total, completed: 0 });
      const today = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
      let completed = 0;
      try {
        for (const file of toAdd) {
          const dataUrl = await readFileAsDataURL(file);
          const folderFile: FolderFile = {
            id: `ff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            size: formatFileSize(file.size),
            sizeInBytes: file.size,
            fileType: getFileTypeFromFile(file),
            uploadDate: today,
            url: dataUrl,
          };
          await addFileToFolder(fileId, projectId, folderId, folderFile);
          completed += 1;
          setUploadProgress((prev) => (prev ? { ...prev, completed } : null));
        }
        setUploadProgress((prev) => (prev ? { ...prev, done: true } : null));
        await syncFolderFiles(folderId);
        if (uploadProgressClearRef.current) clearTimeout(uploadProgressClearRef.current);
        uploadProgressClearRef.current = setTimeout(() => {
          setUploadProgress(null);
          uploadProgressClearRef.current = null;
        }, 3000);
      } catch {
        setUploadProgress(null);
      } finally {
        isProcessingFilesRef.current = false;
      }
    },
    [fileId, projectId, project, addFileToFolder, syncFolderFiles, getTotalStorageUsed, STORAGE_LIMIT_BYTES]
  );

  const currentFolder = project?.folders.find((f) => f.id === openFolder);
  const statusVariant =
    project?.status === "Live" ? "live" : project?.status === "Pending" ? "pending" : "completed";
  const projectStorageBytes =
    project?.folders.reduce(
      (sum, fo) =>
        sum +
        fo.files.reduce(
          (n, fi) => n + (typeof fi.sizeInBytes === "number" ? fi.sizeInBytes : 0),
          0
        ),
      0
    ) ?? 0;
  const projectStorageFormatted = formatStorageSize(projectStorageBytes);
  const totalStorageUsed = getTotalStorageUsed();
  const storageAtLimit = totalStorageUsed >= STORAGE_LIMIT_BYTES;
  const storagePercent = Math.min(100, (totalStorageUsed / STORAGE_LIMIT_BYTES) * 100);
  const storageBarColor =
    storagePercent >= 95 ? "bg-red-500" : totalStorageUsed > 80 * 1024 * 1024 ? "bg-orange-500" : "bg-primary";

  const loadActiveRequests = useCallback(async () => {
    if (!projectId) {
      setActiveRequestsList([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("upload_requests")
        .select(
          "token, code, folder_id, project_id, client_file_id, request_description, file_type_guidance, business_name, created_at, is_active, folders(name)"
        )
        .eq("project_id", projectId)
        .eq("is_active", true);
      if (error) throw error;
      const list = (data ?? []).map(
        (row: {
          token: string;
          code: string;
          folder_id: string;
          project_id: string;
          client_file_id: string;
          request_description: string;
          file_type_guidance: string;
          business_name: string;
          created_at: string;
          is_active: boolean;
          folders: { name: string } | null;
        }) => ({
          token: row.token,
          request: {
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
          } as StoredRequest,
        })
      );
      setActiveRequestsList(list);
    } catch {
      setActiveRequestsList([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeRequestsOpen) loadActiveRequests();
  }, [activeRequestsOpen, loadActiveRequests]);

  useEffect(() => {
    setSelectedFolderFileIds(new Set());
  }, [openFolder]);

  useEffect(() => {
    const folderParam = searchParams.get("folder");
    const viewParam = searchParams.get("view");
    if (!file || !project || !folderParam || !viewParam) return;
    const folder = (project?.folders ?? []).find((fo) => fo.id === folderParam);
    const folderFile = folder?.files.find((f) => f.id === viewParam);
    if (folder && folderFile) {
      setOpenFolder(folder.id);
      setViewingFolderFile(folderFile);
    }
  }, [file?.id, project?.id, searchParams]);

  useEffect(() => {
    if (!viewingFolderFile || !currentFolder || !fileId || !projectId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = currentFolder.files.findIndex((f) => f.id === viewingFolderFile.id);
        if (idx > 0) {
          setViewingFileNameEdit(null);
          setViewingFolderFile(currentFolder.files[idx - 1]);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const idx = currentFolder.files.findIndex((f) => f.id === viewingFolderFile.id);
        if (idx >= 0 && idx < currentFolder.files.length - 1) {
          setViewingFileNameEdit(null);
          setViewingFolderFile(currentFolder.files[idx + 1]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setViewingFileNameEdit(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewingFolderFile, currentFolder, fileId, projectId]);

  const handleDeactivateRequest = useCallback(async (token: string) => {
    try {
      const { error } = await supabase
        .from("upload_requests")
        .update({ is_active: false })
        .eq("token", token);
      if (error) throw error;
      setActiveRequestsList((prev) => prev.filter((item) => item.token !== token));
      toast.success("Upload request closed. Clients can no longer use this link.");
    } catch (err) {
      toast.error(mapSupabaseError(err));
    }
  }, []);

  const requestLinkFor = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/request?token=${token}`;

  const handleSaveFolderFileName = (folderFileId: string) => {
    if (!fileId || !projectId || !currentFolder) {
      setEditingFolderFileId(null);
      return;
    }
    const file = currentFolder.files.find((f) => f.id === folderFileId);
    const name = file ? preserveExtensionName(file.name, editingFolderFileName) : editingFolderFileName.trim();
    if (name) {
      updateFileInFolder(fileId, projectId, currentFolder.id, folderFileId, { name });
      setEditingFolderFileId(null);
      toast.success("Name updated");
    } else {
      setEditingFolderFileId(null);
    }
  };

  const handleViewFolderFile = (f: FolderFile) => {
    if (!f.url) {
      toast.error("File is not available to view.");
      return;
    }
    setViewingFolderFile(f);
  };

  const handleDownloadFolderFile = (f: FolderFile) => {
    if (!f.url) {
      toast.error("File is not available for download.");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = f.url;
      a.download = f.name || "download";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleMoveToFolder = (targetFolderId: string) => {
    if (!fileToMove || !fileId || !projectId) return;
    const { folderFile, fromFolderId } = fileToMove;
    if (targetFolderId === fromFolderId) {
      setFileToMove(null);
      return;
    }
    addFileToFolder(fileId, projectId, targetFolderId, folderFile);
    deleteFileFromFolder(fileId, projectId, fromFolderId, folderFile.id);
    toast.success(`Moved "${folderFile.name}" to folder`);
    setFileToMove(null);
    if (viewingFolderFile?.id === folderFile.id) setViewingFolderFile(null);
  };

  const getShareLinkForFile = (folderFileId: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (!fileId || !projectId || !currentFolder) return "";
    return `${base}/file/${fileId}/project/${projectId}?folder=${currentFolder.id}&view=${encodeURIComponent(folderFileId)}`;
  };

  const toggleFileSelected = (folderFileId: string) => {
    setSelectedFolderFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderFileId)) next.delete(folderFileId);
      else next.add(folderFileId);
      return next;
    });
  };

  const clearSelection = () => setSelectedFolderFileIds(new Set());

  const handleDeleteSelectedClick = () => {
    if (selectedFolderFileIds.size === 0) return;
    setSelectedDeleteOpen(true);
  };

  const handleDeleteSelectedConfirm = () => {
    if (!fileId || !projectId || !currentFolder || selectedFolderFileIds.size === 0) return;
    selectedFolderFileIds.forEach((id) => {
      deleteFileFromFolder(fileId, projectId, currentFolder.id, id);
    });
    toast.success(`${selectedFolderFileIds.size} file(s) deleted`);
    clearSelection();
    setSelectedDeleteOpen(false);
  };

  const handleCopyShareLinks = async () => {
    if (selectedFolderFileIds.size === 0) return;
    const links = Array.from(selectedFolderFileIds).map((id) => getShareLinkForFile(id));
    const text = links.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(links.length === 1 ? "Link copied" : `${links.length} links copied to clipboard`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (!loading && (!file || !project)) {
    return (
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto min-w-0">
        <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2 mb-4">
          <Link to="/files">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-muted-foreground">
          <p>Project not found.</p>
          <Link to="/files" className="text-primary hover:underline">Back to Files</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (file ? navigate(`/file/${file.id}`) : navigate("/files"))}
          className="shrink-0 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        {loading ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        ) : file && project ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/file/${file.id}`} className="hover:text-primary transition-colors">{file.name}</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{project.name}</span>
          </div>
        ) : null}
      </div>

      {loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading project…</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-8 w-56 bg-muted rounded animate-pulse" />
              <div className="h-4 w-40 bg-muted/80 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted/80 rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted/80 rounded" />
            </div>
            <div className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted/80 rounded mb-2" />
              <div className="h-4 w-full bg-muted/80 rounded" />
            </div>
            <div className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse">
              <div className="h-4 w-16 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted/80 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-5 w-32 bg-muted rounded mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-full bg-muted/80 rounded" />
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-5 w-28 bg-muted rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 w-full bg-muted/80 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && (!file || !project) && (
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-muted-foreground">
          <p>Project not found.</p>
          <Link to="/files" className="text-primary hover:underline">Back to Files</Link>
        </div>
      )}

      {!loading && file && project && (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            {editingProjectName ? (
              <input
                value={projectNameEdit}
                onChange={(e) => setProjectNameEdit(e.target.value)}
                onBlur={() => {
                  const v = projectNameEdit.trim();
                  if (v) updateProject(file.id, project.id, { name: v });
                  setEditingProjectName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = projectNameEdit.trim();
                    if (v) updateProject(file.id, project.id, { name: v });
                    setEditingProjectName(false);
                  }
                  if (e.key === "Escape") {
                    setProjectNameEdit(project.name);
                    setEditingProjectName(false);
                  }
                }}
                className="text-2xl font-bold text-foreground bg-transparent border border-primary rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[200px]"
                autoFocus
              />
            ) : (
              <h1
                className="text-2xl font-bold text-foreground cursor-pointer hover:underline"
                onClick={() => {
                  if (!isCompleted) {
                    setProjectNameEdit(project.name);
                    setEditingProjectName(true);
                  }
                }}
                title={isCompleted ? undefined : "Click to edit project name"}
                role={isCompleted ? undefined : "button"}
              >
                {project.name}
              </h1>
            )}
            <Badge variant={statusVariant}>{project.status}</Badge>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full font-medium">
              Storage: {projectStorageFormatted}
            </span>
            {isCompleted && <Lock className="h-4 w-4 text-completed" />}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono">{project.projectNumber || project.id}</span>
            <span>Created: {project.dateCreated}</span>
            {project.completedDate && <span>Completed: {project.completedDate}</span>}
          </div>
        </div>
        {isCompleted ? (
          <Button variant="outline" onClick={() => setShowShare(true)}>Share</Button>
        ) : (
          <div className="flex gap-2">
            <select
              value={project.status}
              onChange={(e) => {
                const next = e.target.value as "Live" | "Pending" | "Completed";
                if (next === "Completed") {
                  setShowCompleteConfirm(true);
                  return;
                }
                updateProject(file.id, project.id, {
                  status: next,
                  completedDate: undefined,
                });
              }}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="Live">Live</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
            <Button variant="gold" size="sm" onClick={() => setShowShare(true)}>Share</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Folders</p>
          <p className="text-2xl font-bold text-foreground">{getProjectStats(project).folders}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Documents</p>
          <p className="text-2xl font-bold text-foreground">{getProjectStats(project).files}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Images</p>
          <p className="text-2xl font-bold text-foreground">{getProjectStats(project).images}</p>
        </div>
      </div>

      {/* FIELDS */}
      <section className="mb-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Fields</h2>
          <p className="text-sm text-muted-foreground">Add structured information. Use a template to save time.</p>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {project.fields.length === 0 && !addingField && (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <List className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                No fields yet. Click Add a field to start adding structured information.
              </p>
            </div>
          )}
          {project.fields.map((field, fieldIndex) => (
            <div key={field.id} className="flex items-center border-b border-border last:border-0 group">
              {editingFieldId === field.id ? (
                <>
                  <input
                    className="flex-1 px-4 py-3 bg-transparent text-sm border-r border-border focus:outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                    }}
                    onBlur={handleSaveEdit}
                  />
                  <input
                    className="flex-1 px-4 py-3 bg-transparent text-sm font-medium focus:outline-none"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveEdit();
                        const nextField = project.fields[fieldIndex + 1];
                        if (nextField) {
                          setTimeout(() => {
                            setEditingFieldId(nextField.id);
                            setEditName(nextField.name);
                            setEditValue(nextField.value);
                          }, 0);
                        }
                      }
                    }}
                    onBlur={handleSaveEdit}
                  />
                </>
              ) : (
                <>
                  <div
                    className="flex-1 px-4 py-3 text-sm text-muted-foreground border-r border-border cursor-pointer"
                    onClick={() => {
                      if (!isCompleted) {
                        setEditingFieldId(field.id);
                        setEditName(field.name);
                        setEditValue(field.value);
                      }
                    }}
                  >
                    {field.name}
                  </div>
                  <div
                    className="flex-1 px-4 py-3 text-sm font-medium text-foreground cursor-pointer"
                    onClick={() => {
                      if (!isCompleted) {
                        setEditingFieldId(field.id);
                        setEditName(field.name);
                        setEditValue(field.value);
                      }
                    }}
                  >
                    {field.value || <span className="text-muted-foreground italic">Empty</span>}
                  </div>
                </>
              )}
              {!isCompleted && (
                <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFieldId(field.id);
                      setEditName(field.name);
                      setEditValue(field.value);
                    }}
                    className="p-1.5 hover:bg-muted rounded"
                    aria-label="Edit field"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFieldToDelete({ id: field.id, name: field.name })}
                    className="p-1.5 hover:bg-muted rounded"
                    aria-label="Delete field"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {!isCompleted && addingField && (
            <div className="flex items-center border-t border-dashed border-border bg-muted/20">
              <input
                autoFocus
                placeholder="Field name e.g. Case Number"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).nextElementSibling?.focus();
                  }
                  if (e.key === "Escape") setAddingField(false);
                }}
                className="flex-1 px-4 py-3 bg-transparent text-sm border-r border-border focus:outline-none placeholder:text-muted-foreground/60"
              />
              <input
                placeholder="Value"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddField();
                  if (e.key === "Escape") setAddingField(false);
                }}
                className="flex-1 px-4 py-3 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          )}
        </div>
        {!isCompleted && (
          <div className="flex gap-2 mt-3">
            {!addingField ? (
<button
              type="button"
              onClick={() => setAddingField(true)}
              className="flex-1 py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
                <Plus className="h-4 w-4 inline mr-1" /> Click to add a new field
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAddingField(false)}
                className="py-2.5 px-4 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            )}
            <div className="relative group">
              <button type="button" className="px-4 py-2.5 border border-primary/20 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" /> Use a Template
              </button>
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg w-64 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                  >
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.fields.length} fields · {t.folders.length} folders</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FOLDERS */}
      <section className="mb-10">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Folders</h2>
          <p className="text-sm text-muted-foreground">Organise your files, photos, and videos into folders.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {!isCompleted && (
            <input
              ref={gridFileInputRef}
              type="file"
              accept="*/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (uploadTargetFolderId) {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  e.target.value = "";
                  setUploadTargetFolderId(null);
                  if (files.length > 0) processFiles(files, uploadTargetFolderId);
                } else {
                  e.target.value = "";
                }
              }}
            />
          )}
          {project.folders.length === 0 && !addingFolder && (
            <div className="col-span-full flex flex-col items-center justify-center py-10 px-6 text-center border border-dashed border-border rounded-xl bg-muted/10">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No folders yet. Create a folder by choosing a type (Documents, Photos, Videos, General) then naming it.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAddingFolder(true);
                  setNewFolderName("");
                  setNewFolderType("general");
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Folder
              </Button>
            </div>
          )}
          {project.folders.map((folder) => (
            <div
              key={folder.id}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all text-left group relative flex flex-col h-full"
            >
              <button
                type="button"
                onClick={() => setOpenFolder(folder.id)}
                className="absolute inset-0 rounded-xl text-left"
                aria-label={`Open ${folder.name}`}
              />
              <div className="relative flex-1 min-h-0 flex flex-col">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 shrink-0 ${folderColor(folder.type)}`}>
                  <FolderOpen className="h-5 w-5" />
                </div>
                <p className="font-medium text-foreground text-sm pointer-events-none">{folder.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 pointer-events-none">
                  {FOLDER_TYPES.find((ft) => ft.value === folder.type)?.label ?? folder.type}
                </p>
                <p className="text-xs text-muted-foreground mt-1 pointer-events-none min-h-[2.5rem]">
                  {`${folder.files.length} files · ${formatStorageSize(folder.files.reduce((n, fi) => n + (typeof fi.sizeInBytes === "number" ? fi.sizeInBytes : 0), 0))}`}
                </p>
                <div className="mt-auto pt-3 flex flex-wrap gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenFolder(folder.id);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-transparent hover:bg-muted transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUploadTargetFolderId(folder.id);
                        setTimeout(() => gridFileInputRef.current?.click(), 0);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-transparent hover:bg-muted transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRequestFilesFolder({
                        fileId: file.id,
                        projectId: project.id,
                        folderId: folder.id,
                        folderName: folder.name,
                      });
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#1B4F8A] text-[#1B4F8A] bg-transparent hover:bg-[#1B4F8A]/10 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Request Files
                  </button>
                </div>
                {!isCompleted && (
                  <div className="absolute top-0 right-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFolderMenuOpen((prev) => (prev === folder.id ? null : folder.id));
                      }}
                      className="p-1.5 hover:bg-muted rounded relative z-10"
                      aria-label="Folder options"
                    >
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {folderMenuOpen === folder.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          aria-hidden
                          onClick={() => setFolderMenuOpen(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 py-1 bg-card border border-border rounded-lg shadow-lg z-30 min-w-[120px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFolderToDelete({ id: folder.id, name: folder.name });
                              setFolderMenuOpen(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!isCompleted &&
            (addingFolder ? (
              <div className={`border border-border rounded-xl bg-card p-5 shadow-sm ${project.folders.length === 0 ? "col-span-full max-w-md" : ""}`}>
                <p className="text-sm font-medium text-foreground mb-3">New folder</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="new-folder-type" className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Folder type
                    </label>
                    <select
                      id="new-folder-type"
                      value={newFolderType}
                      onChange={(e) => setNewFolderType(e.target.value as Folder["type"])}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {FOLDER_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                          {ft.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="new-folder-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Folder name
                    </label>
                    <input
                      id="new-folder-name"
                      type="text"
                      autoFocus
                      value={newFolderName}
                      placeholder="e.g. ID documents, Contract photos"
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateFolder();
                        if (e.key === "Escape") {
                          setAddingFolder(false);
                          setNewFolderName("");
                          setNewFolderType("general");
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddingFolder(false);
                        setNewFolderName("");
                        setNewFolderType("general");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddingFolder(true);
                  setNewFolderName("");
                  setNewFolderType("general");
                }}
                className="border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
              >
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-sm">New Folder</span>
                <span className="text-xs mt-1 opacity-80">Choose type (Documents, Photos, Videos…) then name</span>
              </button>
            ))}
        </div>
      </section>

      {/* Active Upload Requests */}
      <section className="mb-10">
        <button
          type="button"
          onClick={() => setActiveRequestsOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {activeRequestsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Active Upload Requests
        </button>
        {activeRequestsOpen && (
          <div className="mt-3 border border-border rounded-xl overflow-hidden bg-card">
            {activeRequestsList.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No active upload requests for this project.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activeRequestsList.map(({ token, request }) => (
                  <li key={token} className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm">{request.folderName}</p>
                      <p className="text-xs text-muted-foreground truncate" title={request.requestDescription}>
                        {request.requestDescription.length > 60
                          ? `${request.requestDescription.slice(0, 60)}…`
                          : request.requestDescription}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString("en-ZA", { dateStyle: "short" }) : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(requestLinkFor(token));
                          toast.success("Link copied");
                        }}
                      >
                        Copy Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(request.code);
                          toast.success("Code copied");
                        }}
                      >
                        Copy Code
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeactivateRequest(token)}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Folder overlay */}
      {currentFolder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setOpenFolder(null)} />
          <div className="ml-auto w-full max-w-2xl bg-card shadow-xl animate-slide-in-right relative flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setOpenFolder(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="font-semibold text-foreground">{currentFolder.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {FOLDER_TYPES.find((ft) => ft.value === currentFolder.type)?.label ?? currentFolder.type}
                    {` · ${currentFolder.files.length} files`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isCompleted && (
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => !storageAtLimit && fileInputRef.current?.click()}
                    className="gap-1.5"
                    disabled={storageAtLimit}
                  >
                    <Upload className="h-4 w-4" />
                    Add files
                  </Button>
                )}
                <button type="button" onClick={() => setOpenFolder(null)} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {uploadProgress && (
              <div className="px-6 py-2 border-b border-border bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                {uploadProgress.done
                  ? `${uploadProgress.completed} file${uploadProgress.completed === 1 ? "" : "s"} uploaded successfully`
                  : `Uploading ${uploadProgress.completed} of ${uploadProgress.total} files`}
              </div>
            )}
            {selectedFolderFileIds.size > 0 && (
              <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-muted/30">
                <span className="text-sm font-medium text-foreground">
                  {selectedFolderFileIds.size} selected
                </span>
                <div className="flex gap-2">
                  {!isCompleted && (
                    <Button type="button" variant="destructive" size="sm" onClick={handleDeleteSelectedClick}>
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete selected
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-auto p-6">
              {currentFolder.type === "photos" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {currentFolder.files.map((f, idx) => {
                    const isImage = f.fileType === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                    return (
                      <div
                        key={f.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isImage && f.url) {
                            const imageFiles = currentFolder.files.filter(
                              (file) => file.fileType === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
                            );
                            const imageIndex = imageFiles.findIndex((file) => file.id === f.id);
                            setLightboxIndex(imageIndex >= 0 ? imageIndex : 0);
                            setLightboxOpen(true);
                          } else {
                            setViewingFolderFile(f);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          if (isImage && f.url) {
                            const imageFiles = currentFolder.files.filter(
                              (file) => file.fileType === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
                            );
                            const imageIndex = imageFiles.findIndex((file) => file.id === f.id);
                            setLightboxIndex(imageIndex >= 0 ? imageIndex : 0);
                            setLightboxOpen(true);
                          } else {
                            setViewingFolderFile(f);
                          }
                        }}
                        className="aspect-square bg-muted rounded-lg relative group flex items-center justify-center border border-border overflow-hidden cursor-pointer"
                      >
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              toggleFileSelected(f.id);
                            }}
                            className="absolute top-2 left-2 z-20 p-1 rounded bg-card border border-border shadow hover:bg-muted"
                            aria-label={selectedFolderFileIds.has(f.id) ? "Deselect" : "Select"}
                          >
                            {selectedFolderFileIds.has(f.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        {f.fileType === "image" && f.url && f.storagePath ? (
                          <SafeImage
                            src={f.url}
                            alt={f.name}
                            className="w-full h-full object-cover"
                            onErrorRefresh={
                              fileId && projectId && currentFolder
                                ? async () => {
                                    const url = await refreshFileUrl(f.storagePath!);
                                    if (url) {
                                      updateFileInFolder(fileId, projectId, currentFolder.id, f.id, { url });
                                      return url;
                                    }
                                    return null;
                                  }
                                : undefined
                            }
                          />
                        ) : f.fileType === "image" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 rounded-lg p-2 text-center">
                            <ImageOff className="h-8 w-8 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Preview not available</span>
                          </div>
                        ) : f.fileType === "pdf" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-600 rounded-lg p-2">
                            <span className="text-white font-bold text-sm">PDF</span>
                            <span className="text-white/90 text-xs truncate w-full text-center mt-1">{f.name}</span>
                          </div>
                        ) : f.fileType === "word" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-blue-600 rounded-lg p-2">
                            <span className="text-white font-bold text-sm">DOC</span>
                            <span className="text-white/90 text-xs truncate w-full text-center mt-1">{f.name}</span>
                          </div>
                        ) : f.fileType === "excel" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-green-700 rounded-lg p-2">
                            <span className="text-white font-bold text-sm">XLS</span>
                            <span className="text-white/90 text-xs truncate w-full text-center mt-1">{f.name}</span>
                          </div>
                        ) : f.fileType === "video" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-purple-600 rounded-lg p-2">
                            <Play className="h-8 w-8 text-white" />
                            <span className="text-white/90 text-xs truncate w-full text-center mt-1">{f.name}</span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-lg p-2">
                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs truncate w-full text-center mt-1">{f.name}</span>
                          </div>
                        )}
                        {editingFolderFileId === f.id && !isCompleted ? (
                          <div className="absolute bottom-0 left-0 right-0 bg-card border border-primary rounded flex items-center text-xs overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingFolderFileName}
                              onChange={(e) => setEditingFolderFileName(e.target.value)}
                              onBlur={() => handleSaveFolderFileName(f.id)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") handleSaveFolderFileName(f.id);
                                if (e.key === "Escape") setEditingFolderFileId(null);
                              }}
                              className="flex-1 min-w-0 px-1.5 py-1 bg-transparent text-foreground focus:outline-none focus:ring-0"
                              autoFocus
                            />
                            {hasProtectedExtension(f.name) && (
                              <span className="shrink-0 px-1.5 py-1 text-muted-foreground border-l border-border">
                                {getExtension(f.name)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`absolute bottom-0 left-0 right-0 bg-card/90 text-xs p-1.5 truncate text-muted-foreground ${!isCompleted ? "cursor-pointer hover:text-foreground" : ""}`}
                            title={!isCompleted ? "Click to edit name (extension is kept)" : undefined}
                            onClick={!isCompleted ? (e) => {
                              e.stopPropagation();
                              setEditingFolderFileId(f.id);
                              setEditingFolderFileName(hasProtectedExtension(f.name) ? getBasename(f.name) : f.name);
                            } : undefined}
                            role={!isCompleted ? "button" : undefined}
                          >
                            {f.name}
                          </p>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setEditingFolderFileId(f.id);
                                setEditingFolderFileName(hasProtectedExtension(f.name) ? getBasename(f.name) : f.name);
                              }}
                              className="p-1 bg-card rounded shadow hover:bg-muted"
                              aria-label="Edit name"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleViewFolderFile(f);
                            }}
                            className="p-1 bg-card rounded shadow hover:bg-muted"
                            aria-label="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDownloadFolderFile(f);
                            }}
                            className="p-1 bg-card rounded shadow hover:bg-muted"
                            aria-label="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setFileToMove({ folderFile: f, fromFolderId: currentFolder.id });
                              }}
                              className="p-1 bg-card rounded shadow hover:bg-muted"
                              aria-label="Move to folder"
                              title="Move to another folder"
                            >
                              <FolderInput className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setFileInFolderToDelete({ folderFileId: f.id, name: f.name });
                              }}
                              className="p-1 bg-card rounded shadow text-destructive hover:bg-destructive/10"
                              aria-label="Delete file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-0">
                  {currentFolder.files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0 group">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => toggleFileSelected(f.id)}
                          className="p-1 rounded hover:bg-muted shrink-0"
                          aria-label={selectedFolderFileIds.has(f.id) ? "Deselect" : "Select"}
                        >
                          {selectedFolderFileIds.has(f.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <FileText className={`h-5 w-5 shrink-0 ${fileTypeIcon(f.fileType)}`} />
                      <div className="flex-1 min-w-0">
                        {editingFolderFileId === f.id && !isCompleted ? (
                          <div className="flex items-center gap-1 w-full min-w-0">
                            <input
                              type="text"
                              value={editingFolderFileName}
                              onChange={(e) => setEditingFolderFileName(e.target.value)}
                              onBlur={() => handleSaveFolderFileName(f.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveFolderFileName(f.id);
                                if (e.key === "Escape") setEditingFolderFileId(null);
                              }}
                              className="flex-1 min-w-0 text-sm font-medium text-foreground px-2 py-1 border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            {hasProtectedExtension(f.name) && (
                              <span className="text-sm text-muted-foreground shrink-0">{getExtension(f.name)}</span>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-sm font-medium text-foreground truncate ${!isCompleted ? "cursor-pointer hover:underline" : ""}`}
                            title={!isCompleted ? "Click to edit name (extension is kept)" : undefined}
                            onClick={!isCompleted ? () => {
                              setEditingFolderFileId(f.id);
                              setEditingFolderFileName(hasProtectedExtension(f.name) ? getBasename(f.name) : f.name);
                            } : undefined}
                            role={!isCompleted ? "button" : undefined}
                          >
                            {f.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {f.size} · {f.uploadDate}
                        </p>
                      </div>
                      {!isCompleted && editingFolderFileId !== f.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFolderFileId(f.id);
                            setEditingFolderFileName(hasProtectedExtension(f.name) ? getBasename(f.name) : f.name);
                          }}
                          className="p-1.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Edit name"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleViewFolderFile(f)}
                        className="p-1.5 hover:bg-muted rounded"
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadFolderFile(f)}
                        className="p-1.5 hover:bg-muted rounded"
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => setFileToMove({ folderFile: f, fromFolderId: currentFolder.id })}
                        className="p-1.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Move to folder"
                          title="Move to another folder"
                        >
                          <FolderInput className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => setFileInFolderToDelete({ folderFileId: f.id, name: f.name })}
                          className="p-1.5 hover:bg-muted rounded text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {currentFolder.files.length === 0 && (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">No files yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Drop files here or use the upload area below.</p>
                </div>
              )}
              {!isCompleted && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      e.target.value = "";
                      if (files.length > 0) processFiles(files, currentFolder.id);
                    }}
                  />
                  <div className="mt-6 relative">
                    {storageAtLimit && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-muted/90 border-2 border-dashed border-border">
                        <p className="text-sm font-medium text-foreground text-center px-4">
                          Storage limit reached. Delete files to free up space or contact support to upgrade.
                        </p>
                      </div>
                    )}
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                        storageAtLimit
                          ? "border-border cursor-not-allowed"
                          : isDragOver
                            ? "border-primary bg-primary/10 cursor-pointer"
                            : "border-border hover:border-primary cursor-pointer"
                      }`}
                      onClick={() => !storageAtLimit && fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        if (storageAtLimit) return;
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (storageAtLimit) return;
                        const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
                        if (files.length > 0) processFiles(files, currentFolder.id);
                      }}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
                    </div>
                    <div className="mt-3 flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        {formatStorageSize(totalStorageUsed)} of 100 MB used
                      </p>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${storageBarColor}`}
                          style={{ width: `${storagePercent}%` }}
                        />
                      </div>
                      {storagePercent >= 95 && totalStorageUsed > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Almost full. Delete some files to free up space.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File viewer (View) - easy to go back, sideways nav, edit name, delete */}
      {viewingFolderFile && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-background">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setViewingFolderFile(null); setViewingFileNameEdit(null); }}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {viewingFileNameEdit !== null && !isCompleted ? (
                <>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-md">
                    <Input
                      value={viewingFileNameEdit}
                      onChange={(e) => setViewingFileNameEdit(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = preserveExtensionName(viewingFolderFile.name, viewingFileNameEdit);
                          if (name && fileId && projectId && currentFolder) {
                            updateFileInFolder(fileId, projectId, currentFolder.id, viewingFolderFile.id, { name });
                            setViewingFolderFile({ ...viewingFolderFile, name });
                            setViewingFileNameEdit(null);
                            toast.success("Name updated");
                          }
                        }
                        if (e.key === "Escape") setViewingFileNameEdit(null);
                      }}
                      className="flex-1 min-w-0 h-8 text-sm"
                      autoFocus
                    />
                    {hasProtectedExtension(viewingFolderFile.name) && (
                      <span className="text-sm text-muted-foreground shrink-0">{getExtension(viewingFolderFile.name)}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const name = preserveExtensionName(viewingFolderFile.name, viewingFileNameEdit);
                      if (name && fileId && projectId && currentFolder) {
                        updateFileInFolder(fileId, projectId, currentFolder.id, viewingFolderFile.id, { name });
                        setViewingFolderFile({ ...viewingFolderFile, name });
                        setViewingFileNameEdit(null);
                        toast.success("Name updated");
                      }
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setViewingFileNameEdit(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-foreground truncate" title={viewingFolderFile.name}>
                    {viewingFolderFile.name}
                  </span>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => setViewingFileNameEdit(hasProtectedExtension(viewingFolderFile.name) ? getBasename(viewingFolderFile.name) : viewingFolderFile.name)}
                      className="p-1 hover:bg-muted rounded shrink-0"
                      aria-label="Edit name"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadFolderFile(viewingFolderFile)}
              className="shrink-0"
              disabled={!viewingFolderFile.url}
              title={!viewingFolderFile.url ? "File is not available for download" : undefined}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
            {!isCompleted && currentFolder && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFileToMove({ folderFile: viewingFolderFile, fromFolderId: currentFolder.id })}
                className="shrink-0"
              >
                <FolderInput className="h-4 w-4 mr-1.5" />
                Move
              </Button>
            )}
            {!isCompleted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFileInFolderToDelete({ folderFileId: viewingFolderFile.id, name: viewingFolderFile.name });
                  setViewingFolderFile(null);
                  setViewingFileNameEdit(null);
                }}
                className="shrink-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 bg-muted/30 relative">
            {currentFolder && (() => {
              const idx = currentFolder.files.findIndex((f) => f.id === viewingFolderFile.id);
              const prevFile = idx > 0 ? currentFolder.files[idx - 1] : null;
              const nextFile = idx >= 0 && idx < currentFolder.files.length - 1 ? currentFolder.files[idx + 1] : null;
              return (
                <>
                  {prevFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow"
                      onClick={() => {
                        setViewingFileNameEdit(null);
                        setViewingFolderFile(prevFile);
                      }}
                      aria-label="Previous file"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  ) : null}
                  {nextFile ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow"
                      onClick={() => {
                        setViewingFileNameEdit(null);
                        setViewingFolderFile(nextFile);
                      }}
                      aria-label="Next file"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  ) : null}
                </>
              );
            })()}
            {viewingFolderFile.fileType === "image" && viewingFolderFile.url && viewingFolderFile.storagePath ? (
              <SafeImage
                src={viewingFolderFile.url}
                alt={viewingFolderFile.name}
                className="max-w-full max-h-full object-contain"
                onErrorRefresh={
                  fileId && projectId && currentFolder
                    ? async () => {
                        const url = await refreshFileUrl(viewingFolderFile.storagePath!);
                        if (url) {
                          updateFileInFolder(fileId, projectId, currentFolder.id, viewingFolderFile.id, { url });
                          setViewingFolderFile({ ...viewingFolderFile, url });
                          return url;
                        }
                        return null;
                      }
                    : undefined
                }
              />
            ) : viewingFolderFile.fileType === "image" ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-xl max-w-md mx-auto">
                <ImageOff className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Preview not available. The file was saved but the image could not be loaded. Check storage settings if this persists.
                </p>
              </div>
            ) : viewingFolderFile.fileType === "video" && viewingFolderFile.url ? (
              <video
                src={viewingFolderFile.url}
                controls
                className="max-w-full max-h-full"
              >
                Your browser does not support the video tag.
              </video>
            ) : viewingFolderFile.fileType === "video" && !viewingFolderFile.url ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-xl max-w-md mx-auto">
                <ImageOff className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">Preview not available.</p>
              </div>
            ) : viewingFolderFile.fileType === "pdf" && viewingFolderFile.url ? (
              <iframe
                src={viewingFolderFile.url}
                title={viewingFolderFile.name}
                className="w-full max-w-4xl h-[80vh] border border-border rounded-lg bg-white"
              />
            ) : viewingFolderFile.fileType === "pdf" && !viewingFolderFile.url ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-xl max-w-md mx-auto">
                <FileIcon className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">Preview not available.</p>
              </div>
            ) : viewingFolderFile.url ? (
              <iframe
                src={viewingFolderFile.url}
                title={viewingFolderFile.name}
                className="w-full max-w-4xl h-[80vh] border border-border rounded-lg bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8 bg-muted/30 rounded-xl max-w-md mx-auto">
                <FileIcon className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">Preview not available.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {currentFolder && lightboxOpen && imageFilesInFolder.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
          style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full z-10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() =>
              setLightboxIndex((i) =>
                i === 0 ? imageFilesInFolder.length - 1 : i - 1
              )
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/10 rounded-full z-10"
            aria-label="Previous"
          >
            <ArrowLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={() =>
              setLightboxIndex((i) =>
                i === imageFilesInFolder.length - 1 ? 0 : i + 1
              )
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white hover:bg-white/10 rounded-full z-10"
            aria-label="Next"
          >
            <ArrowRight className="h-8 w-8" />
          </button>
          <div className="flex flex-col items-center justify-center max-w-[90vw] max-h-[90vh]">
            {imageFilesInFolder[lightboxIndex]?.url && imageFilesInFolder[lightboxIndex]?.storagePath ? (
              <SafeImage
                src={imageFilesInFolder[lightboxIndex].url}
                alt={imageFilesInFolder[lightboxIndex]?.name ?? ""}
                className="max-w-full max-h-[85vh] object-contain"
                onErrorRefresh={
                  fileId && projectId && currentFolder
                    ? async () => {
                        const img = imageFilesInFolder[lightboxIndex]!;
                        const url = await refreshFileUrl(img.storagePath!);
                        if (url) {
                          updateFileInFolder(fileId, projectId, currentFolder.id, img.id, { url });
                          return url;
                        }
                        return null;
                      }
                    : undefined
                }
              />
            ) : null}
            <p className="text-white text-sm mt-2 text-center">
              {imageFilesInFolder[lightboxIndex]?.name}
            </p>
          </div>
        </div>
      )}

      {/* NOTES */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Notes</h2>
            <p className="text-sm text-muted-foreground">Daily notes with heading, subheading and formatted content.</p>
          </div>
          <div className="flex items-center gap-3">
            {file && project && (
              <Button size="sm" variant="outline" onClick={handleDownloadProjectPDF} title="Download this project (including notes) as PDF">
                <Download className="h-3.5 w-3.5 mr-1" />
                Download PDF
              </Button>
            )}
            {!isCompleted && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Auto-save</label>
                  <Switch checked={autoSave} onCheckedChange={setAutoSave} />
                </div>
                <Button size="sm" variant="outline" onClick={handleAddDailyNote}>
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Add daily note
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {entries.length === 0 && (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No daily notes yet. Click &quot;Add daily note&quot; to create one.
              </p>
            </div>
          )}
          {[...entries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((entry) => (
              <NoteEntryCard
                key={entry.id}
                entry={entry}
                isCompleted={isCompleted}
                autoSave={autoSave}
                contentEditRefs={contentEditRefs}
                onSave={saveEntry}
                onDelete={
                  fileId && projectId
                    ? () =>
                        setNoteToDelete({
                          entryId: entry.id,
                          itemName: (entry.heading || (entry.content || "").replace(/<[^>]+>/g, "").trim()).slice(0, 30) || "Note",
                        })
                    : undefined
                }
                notesTimer={notesTimer}
                expandedByDefault={expandNoteId === entry.id}
                onShare={() => {
                  const title = [entry.heading, entry.subheading].filter(Boolean).join(" · ") || "Note";
                  setShareNoteModal({ noteId: entry.id, noteTitle: title });
                }}
              />
            ))}
        </div>
        {entries.length > 0 && <p className="text-xs text-muted-foreground mt-3">Last saved: {lastSaved}</p>}
      </section>

      {showShare && <ShareModal fileId={file.id} onClose={() => setShowShare(false)} />}
      {shareFileModal && fileId && projectId && (
        <ShareFileModal
          fileId={fileId}
          projectId={projectId}
          folderId={shareFileModal.folderId}
          folderFileId={shareFileModal.folderFileId}
          fileName={shareFileModal.fileName}
          onClose={() => setShareFileModal(null)}
        />
      )}
      {shareNoteModal && fileId && projectId && (
        <ShareNoteModal
          fileId={fileId}
          projectId={projectId}
          noteId={shareNoteModal.noteId}
          noteTitle={shareNoteModal.noteTitle}
          onClose={() => setShareNoteModal(null)}
        />
      )}
      {requestFilesFolder && (
        <RequestFilesModal
          fileId={requestFilesFolder.fileId}
          projectId={requestFilesFolder.projectId}
          folderId={requestFilesFolder.folderId}
          folderName={requestFilesFolder.folderName}
          onClose={() => setRequestFilesFolder(null)}
        />
      )}
      {folderToDelete && file && project && (
        <DeleteConfirmModal
          title="Delete Folder"
          itemName={folderToDelete.name}
          confirmPhrase="Yes, delete this folder"
          isOpen={!!folderToDelete}
          onConfirm={() => {
            deleteFolder(file.id, project.id, folderToDelete.id);
            setFolderToDelete(null);
            if (openFolder === folderToDelete.id) setOpenFolder(null);
          }}
          onCancel={() => setFolderToDelete(null)}
        />
      )}
      {fileInFolderToDelete && file && project && currentFolder && (
        <DeleteConfirmModal
          title="Delete File"
          itemName={fileInFolderToDelete.name}
          confirmPhrase="Yes, delete this file"
          isOpen={!!fileInFolderToDelete}
          onConfirm={() => {
            deleteFileFromFolder(file.id, project.id, currentFolder.id, fileInFolderToDelete.folderFileId);
            setFileInFolderToDelete(null);
          }}
          onCancel={() => setFileInFolderToDelete(null)}
        />
      )}
      {fieldToDelete && file && project && (
        <DeleteConfirmModal
          title="Delete Field"
          itemName={fieldToDelete.name}
          confirmPhrase="Yes, delete this field"
          isOpen={!!fieldToDelete}
          onConfirm={() => {
            deleteField(file.id, project.id, fieldToDelete.id);
            setFieldToDelete(null);
          }}
          onCancel={() => setFieldToDelete(null)}
        />
      )}
      {selectedDeleteOpen && file && project && currentFolder && (
        <DeleteConfirmModal
          title="Delete Selected Files"
          itemName={`${selectedFolderFileIds.size} file(s)`}
          confirmPhrase="Yes, delete these files"
          isOpen={selectedDeleteOpen}
          onConfirm={handleDeleteSelectedConfirm}
          onCancel={() => setSelectedDeleteOpen(false)}
        />
      )}
      {noteToDelete && fileId && projectId && (
        <DeleteConfirmModal
          title="Delete Note"
          itemName={noteToDelete.itemName}
          confirmPhrase="Yes, delete this note"
          isOpen={!!noteToDelete}
          onConfirm={() => {
            deleteNoteEntry(fileId, projectId, noteToDelete.entryId);
            setNoteToDelete(null);
          }}
          onCancel={() => setNoteToDelete(null)}
        />
      )}
      {showCompleteConfirm && file && project && (
        <CompleteConfirmModal
          title="Mark project as completed"
          projectName={project.name}
          confirmPhrase="Yes, mark as complete"
          isOpen={showCompleteConfirm}
          onConfirm={() => {
            updateProject(file.id, project.id, {
              status: "Completed",
              completedDate: new Date().toLocaleDateString("en-ZA"),
            });
            setShowCompleteConfirm(false);
          }}
          onCancel={() => setShowCompleteConfirm(false)}
        />
      )}
      {fileToMove && project && (
        <Dialog open={!!fileToMove} onOpenChange={(open) => !open && setFileToMove(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="shrink-0">
              <DialogTitle>Move to folder</DialogTitle>
              <DialogDescription className="sr-only">
                Move this file to another folder in this project.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto min-h-0 flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                Move &quot;{fileToMove.folderFile.name}&quot; to another folder in this project.
              </p>
              <div className="space-y-1 py-2">
              {project.folders
                .filter((fo) => fo.id !== fileToMove.fromFolderId)
                .map((fo) => (
                  <button
                    type="button"
                    key={fo.id}
                    onClick={() => handleMoveToFolder(fo.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card text-left hover:bg-muted/50 hover:border-primary/30 transition-colors"
                  >
                    <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{fo.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fo.files.length} files</span>
                  </button>
                ))}
              {project.folders.filter((fo) => fo.id !== fileToMove.fromFolderId).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No other folders in this project. Create a folder first.
                </p>
              )}
              </div>
            </div>
            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => setFileToMove(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
        </>
      )}
    </div>
  );
}
