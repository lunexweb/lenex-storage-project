import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { getNextProjectNumber } from "@/lib/referenceUtils";
import { useNavigate } from "react-router-dom";

interface AddProjectModalProps {
  fileId: string;
  onClose: () => void;
}

export default function AddProjectModal({ fileId, onClose }: AddProjectModalProps) {
  const { files, addProject, nextProjectId, templates } = useData();
  const { profile } = useSettings();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"Live" | "Pending" | "Completed">("Live");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const formatExample = profile.projectNumberFormatExample?.trim() || "PRJ-0001";
  const nextProjectNumber = useMemo(() => getNextProjectNumber(files, formatExample), [files, formatExample]);

  const handleCreate = () => {
    const id = nextProjectId();
    const tmpl = selectedTemplate ? templates.find((t) => t.id === selectedTemplate) : null;
    const templateFolders = (tmpl?.folders ?? []).map((fo, i) => ({
      id: `tfo-${Date.now()}-${i}`,
      name: fo.name,
      type: fo.type,
      files: [],
    }));
    const newFieldId = () =>
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `f-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const templateFields = (tmpl?.fields ?? []).map((fname) => ({
      id: newFieldId(),
      name: fname,
      value: "",
    }));

    const project = {
      id,
      projectNumber: nextProjectNumber,
      name: name || "Untitled Project",
      status,
      dateCreated: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
      fields: templateFields,
      folders: templateFolders,
      notes: "",
      noteEntries: [],
      ...(status === "Completed" ? { completedDate: new Date().toLocaleDateString("en-ZA") } : {}),
    };
    addProject(fileId, project);

    onClose();
    navigate(`/file/${fileId}/project/${id}`);
  };

  const selectedTmpl = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground text-lg">Add New Project</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Matter name, Consultation, Installation, Case reference"
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-1.5 font-mono">Project number: {nextProjectNumber} (unique, auto-generated)</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Status</label>
            <div className="flex gap-2">
              {(["Live", "Pending", "Completed"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    status === s
                      ? s === "Live"
                        ? "bg-success text-success-foreground"
                        : s === "Pending"
                          ? "bg-warning text-warning-foreground"
                          : "bg-completed text-completed-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Start with a template</label>
            <p className="text-xs text-muted-foreground mb-3">Choose a template to pre-fill fields. Skip to start blank.</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className={`shrink-0 px-4 py-3 rounded-xl border-2 text-sm transition-all ${!selectedTemplate ? "border-primary bg-primary/5" : "border-border"}`}
              >
                None
              </button>
              {templates.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`shrink-0 px-4 py-3 rounded-xl border-2 text-sm transition-all text-left ${
                    selectedTemplate === t.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.fields.length} fields</p>
                </button>
              ))}
            </div>
          </div>

          {selectedTmpl && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 text-sm text-primary space-y-1">
              <p>
                {selectedTmpl.fields.length} fields will be added: {selectedTmpl.fields.slice(0, 3).join(", ")}
                {selectedTmpl.fields.length > 3 && ` and ${selectedTmpl.fields.length - 3} more`}.
              </p>
              {selectedTmpl.folders.length > 0 && (
                <p>{selectedTmpl.folders.length} folders will be created: {selectedTmpl.folders.map((f) => f.name).join(", ")}.</p>
              )}
            </div>
          )}

          <Button variant="gold" className="w-full h-11" onClick={handleCreate}>
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}
