import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  FolderOpen,
  LayoutTemplate,
  ArrowLeft,
  Loader2,
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  Calendar,
  CheckSquare,
  Circle,
  ChevronDown,
  PenLine,
  Minus,
  Heading,
  FileText,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  GripVertical,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/context/DataContext";
import type { FormSubmissionRow } from "@/context/DataContext";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import type { Template, TemplateField, TemplateFolderDef, Folder, FormFieldType } from "@/data/mockData";

function dataFieldCount(t: Template): number {
  return t.fields.filter((f) => f.type !== "divider" && f.type !== "heading").length;
}
function dataFieldLabels(t: Template): string[] {
  return t.fields.filter((f) => f.type !== "divider" && f.type !== "heading").map((f) => f.label);
}

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

const FIELD_TYPE_OPTIONS: { type: FormFieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text field", icon: <Type className="h-5 w-5" /> },
  { type: "textarea", label: "Text area", icon: <AlignLeft className="h-5 w-5" /> },
  { type: "number", label: "Number", icon: <Hash className="h-5 w-5" /> },
  { type: "email", label: "Email", icon: <Mail className="h-5 w-5" /> },
  { type: "phone", label: "Phone", icon: <Phone className="h-5 w-5" /> },
  { type: "date", label: "Date", icon: <Calendar className="h-5 w-5" /> },
  { type: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-5 w-5" /> },
  { type: "radio", label: "Radio buttons", icon: <Circle className="h-5 w-5" /> },
  { type: "select", label: "Dropdown", icon: <ChevronDown className="h-5 w-5" /> },
  { type: "signature", label: "Signature", icon: <PenLine className="h-5 w-5" /> },
  { type: "divider", label: "Section divider", icon: <Minus className="h-5 w-5" /> },
  { type: "heading", label: "Heading", icon: <Heading className="h-5 w-5" /> },
  { type: "terms", label: "Terms and conditions", icon: <FileText className="h-5 w-5" /> },
];

function newTemplateField(type: FormFieldType, displayOrder: number): TemplateField {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `tf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    type,
    label: "",
    required: false,
    displayOrder,
    ...(type === "radio" || type === "select" ? { options: [""] } : {}),
    ...(type === "terms" ? { termsText: "" } : {}),
  };
}

interface FieldConfigPanelProps {
  type: FormFieldType;
  index?: number;
  field: TemplateField | null;
  onSave: (field: TemplateField) => void;
  onCancel: () => void;
}

function FieldConfigPanel({ type, index, field, onSave, onCancel }: FieldConfigPanelProps) {
  const isDivider = type === "divider";
  const [label, setLabel] = useState(field?.label ?? "");
  const [placeholder, setPlaceholder] = useState(field?.placeholder ?? "");
  const [required, setRequired] = useState(field?.required ?? false);
  const [options, setOptions] = useState<string[]>(field?.options?.length ? [...field.options] : [""]);
  const [termsText, setTermsText] = useState(field?.termsText ?? "");

  const handleSave = () => {
    const displayOrder = field?.displayOrder ?? 0;
    const base: TemplateField = {
      id: field?.id ?? (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `tf-${Date.now()}`),
      type,
      label: type === "divider" ? "—" : label.trim(),
      required,
      displayOrder,
    };
    if (type === "text" || type === "textarea" || type === "number" || type === "email" || type === "phone") {
      onSave({ ...base, placeholder: placeholder.trim() || undefined });
    } else if (type === "radio" || type === "select") {
      onSave({ ...base, options: options.filter((o) => o.trim()) });
    } else if (type === "terms") {
      onSave({ ...base, termsText: termsText.trim() || undefined });
    } else {
      onSave(base);
    }
  };

  if (isDivider) return null;

  return (
    <div className="mb-4 p-4 border border-border rounded-lg bg-muted/20 space-y-3">
      <p className="text-sm font-medium text-foreground">Configure field: {type}</p>
      {(type === "text" || type === "textarea" || type === "number" || type === "email" || type === "phone" || type === "date" || type === "checkbox" || type === "signature" || type === "heading" || type === "terms") && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Label</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Field label" />
        </div>
      )}
      {(type === "text" || type === "textarea" || type === "number" || type === "email" || type === "phone") && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Placeholder (optional)</label>
          <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} placeholder="Placeholder text" />
        </div>
      )}
      {type !== "divider" && type !== "heading" && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded border-input" />
          <span className="text-sm text-foreground">Required</span>
        </label>
      )}
      {(type === "radio" || type === "select") && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Options (one per line / input)</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
              <Plus className="h-3 w-3 mr-1" /> Add option
            </Button>
          </div>
        </div>
      )}
      {type === "terms" && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Terms text</label>
          <textarea
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            placeholder="Terms and conditions text…"
            className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm"
            rows={5}
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>{index !== undefined ? "Save changes" : "Add to form"}</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    templates,
    loading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    generateFormShare,
    getFormSubmissions,
    importFormSubmission,
    addField,
    files,
  } = useData();
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFields, setEditFields] = useState<TemplateField[]>([]);
  const [editFolders, setEditFolders] = useState<TemplateFolderDef[]>([]);
  const [editShareable, setEditShareable] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [configuringField, setConfiguringField] = useState<{ type: FormFieldType; index?: number } | null>(null);
  const [submissionsPanelTemplateId, setSubmissionsPanelTemplateId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [importModal, setImportModal] = useState<{ submission: FormSubmissionRow; templateId: string } | null>(null);
  const [importFileId, setImportFileId] = useState("");
  const [importProjectId, setImportProjectId] = useState("");
  const [importing, setImporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const startEdit = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditing(id);
    setEditName(t.name);
    setEditDescription(t.description ?? "");
    setEditFields(t.fields.map((f, i) => ({ ...f, displayOrder: i })));
    setEditFolders([...t.folders]);
    setEditShareable(t.isShareable ?? false);
    setCreating(false);
    setShowFieldPicker(false);
    setConfiguringField(null);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setEditName("");
    setEditDescription("");
    setEditFields([]);
    setEditFolders([]);
    setEditShareable(false);
    setShowFieldPicker(false);
    setConfiguringField(null);
  };

  const closeEditor = () => {
    setEditing(null);
    setCreating(false);
    setConfiguringField(null);
    setShowFieldPicker(false);
  };

  const currentTemplate = editing ? templates.find((t) => t.id === editing) : null;
  const shareLink =
    currentTemplate?.shareToken && editShareable
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/form?token=${encodeURIComponent(currentTemplate.shareToken)}`
      : "";
  const shareCode = currentTemplate?.shareCode ?? "";

  const save = () => {
    const fields = editFields.map((f, i) => ({ ...f, displayOrder: i }));
    const folders = editFolders.filter((f) => f.name.trim());
    if (!editName.trim()) return;
    const payload = {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      fields,
      folders,
      isShareable: editShareable,
      shareToken: currentTemplate?.shareToken,
      shareCode: currentTemplate?.shareCode,
    };
    if (creating) {
      addTemplate({
        id: `tmpl-${Date.now()}`,
        ...payload,
        isShareable: false,
        shareToken: undefined,
        shareCode: undefined,
      });
      toast.success("Template saved. You can now apply it to any project.");
    } else if (editing) {
      updateTemplate(editing, payload);
      toast.success("Template updated.");
    }
    closeEditor();
  };

  const handleGenerateShare = useCallback(async () => {
    const id = editing;
    if (!id || currentTemplate?.shareToken) return;
    const result = await generateFormShare(id);
    if (result) {
      setEditShareable(true);
      toast.success("Share link and code generated.");
    }
  }, [editing, currentTemplate?.shareToken, generateFormShare]);

  const openSubmissionsPanel = useCallback(
    async (templateId: string) => {
      setSubmissionsPanelTemplateId(templateId);
      setSubmissionsLoading(true);
      try {
        const list = await getFormSubmissions(templateId);
        setSubmissions(list);
      } catch {
        toast.error("Failed to load submissions.");
      } finally {
        setSubmissionsLoading(false);
      }
    },
    [getFormSubmissions]
  );

  useEffect(() => {
    if (editing && currentTemplate?.isShareable) {
      getFormSubmissions(editing).then(setSubmissions).catch(() => {});
    } else if (!editing) {
      setSubmissions([]);
    }
  }, [editing, currentTemplate?.isShareable, getFormSubmissions]);

  const state = location.state as { openSubmissionsForTemplateId?: string } | undefined;
  useEffect(() => {
    const templateId = state?.openSubmissionsForTemplateId;
    if (templateId) {
      openSubmissionsPanel(templateId);
      navigate("/templates", { replace: true, state: {} });
    }
  }, [state?.openSubmissionsForTemplateId]);

  const handleImportConfirm = useCallback(async () => {
    if (!importModal || !importFileId || !importProjectId) return;
    setImporting(true);
    try {
      await importFormSubmission(importModal.submission.id, importFileId, importProjectId);
      const fv = importModal.submission.field_values || {};
      for (const [label, value] of Object.entries(fv)) {
        addField(importFileId, importProjectId, { id: "", name: label, value: String(value ?? "") });
      }
      toast.success("Submission imported.");
      setImportModal(null);
      setImportFileId("");
      setImportProjectId("");
      setSubmissions((prev) => prev.map((s) => (s.id === importModal.submission.id ? { ...s, status: "imported" as const } : s)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }, [importModal, importFileId, importProjectId, importFormSubmission, addField]);

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

      {/* Editor: form builder */}
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

          {/* Section 1: Name and description */}
          <section className="mb-6">
            <label className="text-sm font-medium text-foreground block mb-1.5">Template name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Medical Consultation"
              className="max-w-md mb-3"
            />
            <label className="text-sm font-medium text-foreground block mb-1.5">Description (optional)</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Brief description of this form"
              className="w-full max-w-md min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          </section>

          {/* Section 2: Form fields builder */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Form fields</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Add fields to your form. Drag order with up/down. Edit or remove with the buttons.
            </p>
            {!showFieldPicker && !configuringField && (
              <Button type="button" variant="outline" className="mb-3" onClick={() => setShowFieldPicker(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add field
              </Button>
            )}
            {showFieldPicker && !configuringField && (
              <div className="mb-4 p-4 border border-border rounded-lg bg-muted/20">
                <p className="text-sm font-medium text-foreground mb-2">Choose field type</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {FIELD_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        if (opt.type === "divider") {
                          const next = newTemplateField("divider", editFields.length);
                          setEditFields([...editFields, { ...next, label: "—" }]);
                          setShowFieldPicker(false);
                        } else {
                          setShowFieldPicker(false);
                          setConfiguringField({ type: opt.type });
                        }
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-muted/50 text-foreground text-sm"
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setShowFieldPicker(false)}>
                  Cancel
                </Button>
              </div>
            )}
            {configuringField && (
              <FieldConfigPanel
                type={configuringField.type}
                index={configuringField.index}
                field={configuringField.index !== undefined ? editFields[configuringField.index] : null}
                onSave={(field) => {
                  if (configuringField.index !== undefined) {
                    const next = [...editFields];
                    next[configuringField.index!] = field;
                    setEditFields(next);
                  } else {
                    setEditFields([...editFields, { ...field, displayOrder: editFields.length }]);
                  }
                  setConfiguringField(null);
                }}
                onCancel={() => setConfiguringField(null)}
              />
            )}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 border border-border rounded-lg p-3 bg-muted/20">
              {editFields.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...editFields];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setEditFields(next.map((ff, idx) => ({ ...ff, displayOrder: idx })));
                      }}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={i === editFields.length - 1}
                      onClick={() => {
                        const next = [...editFields];
                        [next[i], next[i + 1]] = [next[i + 1], next[i]];
                        setEditFields(next.map((ff, idx) => ({ ...ff, displayOrder: idx })));
                      }}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {f.type}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                    {f.type === "divider" ? "—" : f.label || "(No label)"}
                  </span>
                  {f.required && (
                    <span className="text-xs text-destructive shrink-0" title="Required">
                      *
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => setConfiguringField({ type: f.type, index: i })}
                    aria-label="Edit field"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setEditFields(editFields.filter((_, j) => j !== i))}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Folders */}
          <section className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-1">Folders</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Add folders to create when this template is applied to a project.
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

          {/* Section 4: Sharing */}
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="shareable-form"
                checked={editShareable}
                onChange={(e) => {
                  setEditShareable(e.target.checked);
                  if (e.target.checked && currentTemplate && !currentTemplate.shareToken) {
                    handleGenerateShare();
                  }
                }}
                className="rounded border-input"
              />
              <label htmlFor="shareable-form" className="text-sm font-medium text-foreground">
                Make this template a shareable form
              </label>
            </div>
            {editShareable && (currentTemplate?.shareToken || shareLink) && (
              <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Share link</label>
                  <div className="flex gap-2">
                    <Input readOnly value={shareLink} className="font-mono text-sm flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (shareLink) {
                          navigator.clipboard.writeText(shareLink);
                          setCopiedLink(true);
                          toast.success("Link copied");
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                    >
                      {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Share code</label>
                  <div className="flex gap-2">
                    <Input readOnly value={shareCode} className="font-mono text-lg flex-1" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (shareCode) {
                          navigator.clipboard.writeText(shareCode);
                          setCopiedCode(true);
                          toast.success("Code copied");
                          setTimeout(() => setCopiedCode(false), 2000);
                        }
                      }}
                    >
                      {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!currentTemplate?.shareToken) handleGenerateShare();
                      const link = shareLink || (currentTemplate?.shareToken ? `${window.location.origin}/form?token=${encodeURIComponent(currentTemplate.shareToken)}` : "");
                      if (link) window.open(link, "_blank");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Preview form
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#20BD5A] text-white"
                    onClick={() => {
                      const link = shareLink || (currentTemplate?.shareToken ? `${window.location.origin}/form?token=${encodeURIComponent(currentTemplate.shareToken)}` : "");
                      const msg = `Please fill in this form.\n\nLink: ${link}\nCode: ${shareCode}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Share via WhatsApp
                  </Button>
                </div>
                {editing && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      {submissions.filter((s) => s.template_id === editing && s.status === "pending").length} pending
                      submission(s)
                    </p>
                    <Button size="sm" variant="outline" onClick={() => editing && openSubmissionsPanel(editing)}>
                      View submissions
                    </Button>
                  </div>
                )}
              </div>
            )}
            {editShareable && !currentTemplate?.shareToken && !shareLink && (
              <Button size="sm" variant="outline" onClick={handleGenerateShare}>
                Generate share link & code
              </Button>
            )}
          </section>

          <Button onClick={save}>Save Template</Button>
        </div>
      )}

      {/* Submissions slide-in panel */}
      {submissionsPanelTemplateId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSubmissionsPanelTemplateId(null)} />
          <div className="relative w-full max-w-md bg-card border-l border-border shadow-xl flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Form submissions</h3>
              <Button variant="ghost" size="icon" onClick={() => setSubmissionsPanelTemplateId(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {submissionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <ul className="space-y-3">
                  {submissions.map((s) => (
                    <li key={s.id} className="p-3 border border-border rounded-lg">
                      <p className="font-medium text-foreground text-sm">{s.submitter_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.submitter_email || "—"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(s.submitted_at).toLocaleString()}</p>
                      <span
                        className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                          s.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : s.status === "imported"
                              ? "bg-green-100 text-green-800"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status}
                      </span>
                      {s.status === "pending" && (
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => setImportModal({ submission: s, templateId: submissionsPanelTemplateId! })}
                        >
                          Import
                        </Button>
                      )}
                    </li>
                  ))}
                  {!submissionsLoading && submissions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No submissions yet.</p>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import submission modal */}
      {importModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !importing && setImportModal(null)} />
          <div className="relative bg-card rounded-xl shadow-xl border border-border w-full max-w-sm p-6">
            <h3 className="font-semibold text-foreground mb-4">Import submission</h3>
            <p className="text-sm text-muted-foreground mb-2">Import into which client file and project?</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Client file</label>
                <select
                  value={importFileId}
                  onChange={(e) => {
                    setImportFileId(e.target.value);
                    setImportProjectId("");
                  }}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">— Select file —</option>
                  {files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Project</label>
                <select
                  value={importProjectId}
                  onChange={(e) => setImportProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                  disabled={!importFileId}
                >
                  <option value="">— Select project —</option>
                  {files
                    .find((f) => f.id === importFileId)
                    ?.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => !importing && setImportModal(null)} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImportConfirm}
                disabled={!importFileId || !importProjectId || importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          </div>
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
                {dataFieldCount(t) === 0
                  ? "No fields"
                  : dataFieldCount(t) <= 4
                    ? dataFieldLabels(t).slice(0, 4).join(", ")
                    : `${dataFieldLabels(t).slice(0, 4).join(", ")}, +${dataFieldCount(t) - 4} more`}
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
                  {dataFieldCount(t)} fields · {t.folders.length} folders
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
