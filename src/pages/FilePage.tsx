import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { ChevronRight, Lock, FolderOpen, FileText, Image, Plus, Hash, Pencil, Check, X, ClipboardList, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useData } from "@/context/DataContext";
import { getProjectStats } from "@/data/mockData";
import { findDuplicateReference } from "@/lib/referenceUtils";
import { formatStorageSize } from "@/lib/utils";
import AddProjectModal from "@/components/modals/AddProjectModal";
import ShareModal from "@/components/modals/ShareModal";
import EditFileModal from "@/components/modals/EditFileModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";

export default function FilePage() {
  const { fileId } = useParams();
  const { files, loading, folderFilesLoaded, updateFile, updateProject, deleteFile, deleteProject } = useData();
  const navigate = useNavigate();
  const [showAddProject, setShowAddProject] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEditFile, setShowEditFile] = useState(false);
  const [showDeleteFile, setShowDeleteFile] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingRef, setEditingRef] = useState(false);
  const [refEditValue, setRefEditValue] = useState("");
  const [refDuplicateWarning, setRefDuplicateWarning] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  const file = (files ?? []).find((f) => f.id === fileId);

  if (!loading && !file) {
    return (
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto min-w-0">
        <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2 mb-4">
          <Link to="/files">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Link>
        </Button>
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3 text-muted-foreground">
          <p>File not found.</p>
          <Link to="/files" className="text-primary hover:underline">Back to Files</Link>
        </div>
      </div>
    );
  }

  const startEditRef = () => {
    setRefEditValue(file?.reference || "");
    setRefDuplicateWarning(false);
    setEditingRef(true);
  };
  const saveRef = () => {
    const v = refEditValue.trim();
    if (v && file?.id != null && findDuplicateReference(files ?? [], v, file.id)) {
      setRefDuplicateWarning(true);
      return;
    }
    if (file?.id) updateFile(file.id, { reference: v || undefined });
    setEditingRef(false);
  };
  const cancelEditRef = () => {
    setEditingRef(false);
    setRefDuplicateWarning(false);
  };

  const projects = file?.projects ?? [];
  const live = projects.filter((p) => p.status === "Live").length;
  const pending = projects.filter((p) => p.status === "Pending").length;
  const completed = projects.filter((p) => p.status === "Completed").length;
  const totalStorage = projects.reduce(
    (sum, p) => sum + p.folders.reduce((s, fo) => s + (fo.files?.length ?? 0), 0),
    0
  );
  const fileStorageBytes = projects.reduce(
    (sum, p) =>
      sum +
      p.folders.reduce(
        (s, fo) => s + (fo.files ?? []).reduce((n, fi) => n + (typeof fi.sizeInBytes === "number" ? fi.sizeInBytes : 0), 0),
        0
      ),
    0
  );
  const fileStorageFormatted = formatStorageSize(fileStorageBytes);

  const statusVariant = (s: string) => (s === "Live" ? "live" : s === "Pending" ? "pending" : "completed");
  const statusBorder = (s: string) =>
    s === "Live" ? "border-l-success" : s === "Pending" ? "border-l-warning" : "border-l-completed";

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto min-w-0">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2">
          <Link to="/files">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Link>
        </Button>
        {loading ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        ) : file ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Dashboard</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">{file?.name}</span>
          </div>
        ) : null}
      </div>

      {loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading file…</span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted/80 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                <div className="h-4 w-full bg-muted/80 rounded mb-1" />
                <div className="h-4 w-1/2 bg-muted/80 rounded" />
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && file && (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{file?.name}</h1>
            <Badge variant={file?.type === "Business" ? "business" : "individual"}>{file?.type}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span title="Unique file ID (cannot be changed)">ID: {file?.id}</span>
            {file?.reference != null && file?.reference !== "" ? (
              editingRef ? (
                <span className="flex items-center gap-1 flex-wrap">
                  <Input
                    value={refEditValue}
                    onChange={(e) => {
                      setRefEditValue(e.target.value);
                      setRefDuplicateWarning(false);
                    }}
                    onBlur={() =>
                      refEditValue.trim() && file?.id != null && setRefDuplicateWarning(findDuplicateReference(files ?? [], refEditValue.trim(), file.id))
                    }
                    className="h-8 w-36 font-mono text-sm"
                    placeholder="Reference"
                  />
                  <button type="button" onClick={saveRef} className="p-1 text-success hover:bg-muted rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={cancelEditRef} className="p-1 text-muted-foreground hover:bg-muted rounded">
                    <X className="h-4 w-4" />
                  </button>
                  {refDuplicateWarning && (
                    <span className="text-xs text-destructive w-full">Reference already in use</span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  <span className="font-mono">{file?.reference}</span>
                  <button
                    type="button"
                    onClick={startEditRef}
                    className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                    title="Edit reference"
                    aria-label="Edit reference"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </span>
              )
            ) : (
              editingRef ? (
                <span className="flex items-center gap-1 flex-wrap">
                  <Input
                    value={refEditValue}
                    onChange={(e) => {
                      setRefEditValue(e.target.value);
                      setRefDuplicateWarning(false);
                    }}
                    onBlur={() =>
                      refEditValue.trim() && file?.id != null && setRefDuplicateWarning(findDuplicateReference(files ?? [], refEditValue.trim(), file.id))
                    }
                    className="h-8 w-36 font-mono text-sm"
                    placeholder="e.g. REF-001"
                  />
                  <button type="button" onClick={saveRef} className="p-1 text-success hover:bg-muted rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={cancelEditRef} className="p-1 text-muted-foreground hover:bg-muted rounded">
                    <X className="h-4 w-4" />
                  </button>
                  {refDuplicateWarning && (
                    <span className="text-xs text-destructive w-full">Reference already in use</span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={startEditRef}
                  className="text-muted-foreground hover:text-primary flex items-center gap-1"
                  aria-label="Add reference"
                >
                  <Hash className="h-3.5 w-3.5" /> Add reference
                </button>
              )
            )}
            {file?.phone && <span>📞 {file?.phone}</span>}
            <span>Created: {file?.dateCreated}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditFile(true)}>Edit File Details</Button>
          <Button variant="destructive" onClick={() => setShowDeleteFile(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete File
          </Button>
          <Button variant="gold" onClick={() => setShowShare(true)}>
            Share File
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Total Projects", value: projects.length, color: "text-primary" },
          { label: "Live", value: live, color: "text-success" },
          { label: "Pending", value: pending, color: "text-warning" },
          { label: "Completed", value: completed, color: "text-completed" },
          { label: "Total Files", value: folderFilesLoaded ? totalStorage : "…", color: "text-muted-foreground" },
          { label: "Storage Used", value: folderFilesLoaded ? fileStorageFormatted : "…", color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        <Button variant="gold" size="sm" onClick={() => setShowAddProject(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Project
        </Button>
      </div>

      <div className="space-y-3">
        {(file?.projects ?? []).map((project) => {
          const ps = getProjectStats(project);
          const isCompleted = project.status === "Completed";
          return (
            <div
              key={project.id}
              onClick={() => navigate(`/file/${file?.id}/project/${project.id}`)}
              className={`bg-card border border-border rounded-xl p-5 border-l-4 ${statusBorder(project.status)} cursor-pointer hover:shadow-md transition-all relative group ${isCompleted ? "opacity-80" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Input
                          value={editingProjectName}
                          onChange={(e) => setEditingProjectName(e.target.value)}
                          onBlur={() => {
                            const v = editingProjectName.trim();
                            if (v && file?.id) updateProject(file.id, project.id, { name: v });
                            setEditingProjectId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = editingProjectName.trim();
                              if (v && file?.id) updateProject(file.id, project.id, { name: v });
                              setEditingProjectId(null);
                            }
                            if (e.key === "Escape") {
                              setEditingProjectName(project.name);
                              setEditingProjectId(null);
                            }
                          }}
                          className="h-8 font-semibold text-foreground flex-1 min-w-0"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const v = editingProjectName.trim();
                            if (v && file?.id) updateProject(file.id, project.id, { name: v });
                            setEditingProjectId(null);
                          }}
                          className="p-1 text-success hover:bg-muted rounded"
                          aria-label="Save name"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProjectName(project.name);
                            setEditingProjectId(null);
                          }}
                          className="p-1 text-muted-foreground hover:bg-muted rounded"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3
                          className={`font-semibold text-foreground ${!isCompleted ? "cursor-pointer hover:underline" : ""}`}
                          onClick={!isCompleted ? () => { setEditingProjectId(project.id); setEditingProjectName(project.name); } : undefined}
                          title={!isCompleted ? "Click to edit project name" : undefined}
                          role={!isCompleted ? "button" : undefined}
                        >
                          {project.name}
                        </h3>
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProjectId(project.id);
                              setEditingProjectName(project.name);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit project name"
                            aria-label="Edit project name"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {isCompleted && <Lock className="h-4 w-4 text-completed" />}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{project.projectNumber || project.id}</span>
                    <Badge variant={statusVariant(project.status)} className="text-xs">
                      {project.status}
                    </Badge>
                    <span>{project.dateCreated}</span>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderOpen className="h-3.5 w-3.5" /> {ps.folders}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> {folderFilesLoaded ? ps.files : "…"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Image className="h-3.5 w-3.5" /> {folderFilesLoaded ? ps.images : "…"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete({ id: project.id, name: project.name });
                    }}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                    title="Delete project"
                    aria-label="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {isCompleted && (
                <div className="absolute inset-0 rounded-xl bg-card/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow-sm flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> This project is closed and cannot be edited
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {(file?.projects ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-card rounded-xl border border-border text-center max-w-lg mx-auto shadow-sm">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-primary/5">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add your first project to organise fields, folders, and files for this client.
            </p>
            <Button variant="gold" size="lg" onClick={() => setShowAddProject(true)}>
              Add project
            </Button>
          </div>
        )}
      </div>

      {showAddProject && file?.id != null && <AddProjectModal fileId={file.id} onClose={() => setShowAddProject(false)} />}
      {showShare && file?.id != null && <ShareModal fileId={file.id} onClose={() => setShowShare(false)} />}
      {showEditFile && file != null && <EditFileModal file={file} onClose={() => setShowEditFile(false)} />}
      <DeleteConfirmModal
        title="Delete File"
        itemName={file?.name ?? ""}
        confirmPhrase="Yes, delete this file"
        isOpen={showDeleteFile}
        onConfirm={() => {
          if (file?.id) deleteFile(file.id);
          navigate("/");
        }}
        onCancel={() => setShowDeleteFile(false)}
      />
      {projectToDelete && (
        <DeleteConfirmModal
          title="Delete Project"
          itemName={projectToDelete.name}
          confirmPhrase="Yes, delete this project"
          isOpen={!!projectToDelete}
          onConfirm={() => {
            if (projectToDelete && file?.id) deleteProject(file.id, projectToDelete.id);
            setProjectToDelete(null);
          }}
          onCancel={() => setProjectToDelete(null)}
        />
      )}
        </>
      )}
    </div>
  );
}
