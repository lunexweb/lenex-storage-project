import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, X, FolderOpen, LayoutTemplate, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/context/DataContext";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import type { TemplateFolderDef, Folder } from "@/data/mockData";

const folderTypes: { value: Folder["type"]; label: string }[] = [
  { value: "documents", label: "Documents" },
  { value: "photos", label: "Photos" },
  { value: "videos", label: "Videos" },
  { value: "general", label: "General" },
];

function TemplatesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-3" />
          <div className="h-4 w-full bg-muted/80 rounded animate-pulse mb-2" />
          <div className="h-4 w-2/3 bg-muted/80 rounded animate-pulse mb-4" />
          <div className="flex justify-between items-center">
            <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-12 bg-muted/60 rounded animate-pulse" />
              <div className="h-8 w-12 bg-muted/60 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFields, setEditFields] = useState<string[]>([]);
  const [editFolders, setEditFolders] = useState<TemplateFolderDef[]>([]);
  const [creating, setCreating] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  const startEdit = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditing(id);
    setEditName(t.name);
    setEditFields([...t.fields]);
    setEditFolders([...t.folders]);
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setEditName("");
    setEditFields([""]);
    setEditFolders([]);
  };

  const closeEditor = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = () => {
    const fields = editFields.filter((f) => f.trim());
    const folders = editFolders.filter((f) => f.name.trim());
    if (!editName.trim()) return;
    if (creating) {
      addTemplate({ id: `tmpl-${Date.now()}`, name: editName.trim(), fields, folders });
      toast.success("Template saved. You can now apply it to any project.");
    } else if (editing) {
      updateTemplate(editing, { name: editName.trim(), fields, folders });
      toast.success("Template updated.");
    }
    closeEditor();
  };

  const handleDeleteClick = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (t) setTemplateToDelete({ id, name: t.name });
  };

  const handleDeleteConfirm = () => {
    if (!templateToDelete) return;
    deleteTemplate(templateToDelete.id);
    toast.success("Template deleted.");
    if (editing === templateToDelete.id) closeEditor();
    setTemplateToDelete(null);
  };

  const isEditorOpen = editing !== null || creating;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2 mb-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Save your most used field sets and folder structures. Apply them to any project in one click.
          </p>
        </div>
        <Button variant="gold" onClick={startCreate} className="shrink-0" disabled={loading}>
          <Plus className="h-4 w-4 mr-1" /> New template
        </Button>
      </header>

      {/* Loading: show layout + skeleton so page feels instant */}
      {loading && (
        <div className="space-y-2 mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            <span>Loading templates…</span>
          </div>
          <TemplatesSkeleton />
        </div>
      )}

      {/* Editor: unlimited fields & folders, scrollable sections */}
      {!loading && isEditorOpen && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {creating ? "Create New Template" : "Edit Template"}
            </h2>
            <Button variant="ghost" size="icon" onClick={closeEditor} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Template name e.g. Medical Consultation"
            className="max-w-md mb-6"
          />

          {/* Fields — unlimited, scrollable */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Fields</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Add as many fields as you need. These become the data fields on each project.
            </p>
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 border border-border rounded-lg p-3 bg-muted/20">
              {editFields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={f}
                    onChange={(e) => {
                      const nf = [...editFields];
                      nf[i] = e.target.value;
                      setEditFields(nf);
                    }}
                    placeholder="Field name"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setEditFields(editFields.filter((_, j) => j !== i))}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setEditFields([...editFields, ""])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add field
              </Button>
            </div>
          </section>

          {/* Folders — unlimited, scrollable */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Folders</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Add as many folders as you need. They are created automatically when this template is applied.
            </p>
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 border border-border rounded-lg p-3 bg-muted/20">
              {editFolders.map((fo, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                  <Input
                    value={fo.name}
                    onChange={(e) => {
                      const nf = [...editFolders];
                      nf[i] = { ...nf[i], name: e.target.value };
                      setEditFolders(nf);
                    }}
                    placeholder="Folder name e.g. Documents"
                    className="flex-1 min-w-[120px]"
                  />
                  <select
                    value={fo.type}
                    onChange={(e) => {
                      const nf = [...editFolders];
                      nf[i] = { ...nf[i], type: e.target.value as Folder["type"] };
                      setEditFolders(nf);
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {folderTypes.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setEditFolders(editFolders.filter((_, j) => j !== i))}
                    aria-label="Remove folder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setEditFolders([...editFolders, { name: "", type: "general" }])}
              >
                <Plus className="h-4 w-4 mr-1" /> Add folder
              </Button>
            </div>
          </section>

          <Button onClick={save}>Save Template</Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && !isEditorOpen && (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-card rounded-xl border border-border shadow-sm text-center max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-primary/5">
            <LayoutTemplate className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No templates yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md">
            Create reusable field sets and folder structures to save time when adding new projects.
          </p>
          <Button variant="gold" size="lg" onClick={startCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first template
          </Button>
        </div>
      )}

      {/* Template grid */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold text-foreground mb-2 truncate" title={t.name}>
                {t.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-1 line-clamp-2">
                {t.fields.length === 0
                  ? "No fields"
                  : t.fields.length <= 4
                    ? t.fields.join(", ")
                    : `${t.fields.slice(0, 4).join(", ")}, +${t.fields.length - 4} more`}
              </p>
              {t.folders.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1 flex-wrap">
                  <FolderOpen className="h-3 w-3 shrink-0" />
                  {t.folders.length > 3
                    ? `${t.folders.slice(0, 3).map((f) => f.name).join(", ")}, +${t.folders.length - 3} more`
                    : t.folders.map((f) => f.name).join(", ")}
                </p>
              )}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {t.fields.length} fields · {t.folders.length} folders
                </span>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(t.id)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteClick(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {templateToDelete && (
        <DeleteConfirmModal
          title="Delete Template"
          itemName={templateToDelete.name}
          confirmPhrase="Yes, delete this template"
          isOpen={!!templateToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setTemplateToDelete(null)}
        />
      )}
    </div>
  );
}
