import { useState, useMemo } from "react";
import { X, Building2, User, Plus, Phone, Mail, CreditCard, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { getNextReference, findDuplicateReference, generateUniqueId } from "@/lib/referenceUtils";
import { toast } from "sonner";

export default function CreateFileModal({ onClose }: { onClose: () => void }) {
  const { files, addFile } = useData();
  const { profile } = useSettings();
  const [type, setType] = useState<"Business" | "Individual" | null>(null);
  const [name, setName] = useState("");
  const [extras, setExtras] = useState({ phone: false, email: false, idNumber: false });
  const [values, setValues] = useState({ phone: "", email: "", idNumber: "" });
  const [autoGenerateRef, setAutoGenerateRef] = useState(true);
  const [manualReference, setManualReference] = useState("");
  const [refDuplicateWarning, setRefDuplicateWarning] = useState(false);

  const formatExample = profile.referenceFormatExample?.trim() || "REF-001";
  const existingRefs = useMemo(() => files.map((f) => f.reference).filter(Boolean) as string[], [files]);
  const generatedRef = useMemo(() => getNextReference(existingRefs, formatExample), [existingRefs, formatExample]);
  const referenceValue = autoGenerateRef ? generatedRef : manualReference.trim();

  const checkDuplicate = (value: string) => {
    setRefDuplicateWarning(findDuplicateReference(files, value));
  };

  const handleCreate = () => {
    if (!name.trim() || !type) return;
    const refToUse = referenceValue || undefined;
    if (refToUse && findDuplicateReference(files, refToUse)) {
      toast.error("Reference already in use");
      return;
    }
    addFile({
      id: generateUniqueId("file"),
      name,
      type,
      phone: values.phone || undefined,
      email: values.email || undefined,
      idNumber: values.idNumber || undefined,
      reference: refToUse,
      dateCreated: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
      lastUpdated: "Just now",
      projects: [],
    });
    toast.success("New file created.");
    onClose();
  };

  const extraFields = [
    { key: "phone" as const, label: "Add Phone Number", icon: Phone, placeholder: "Phone number" },
    { key: "email" as const, label: "Add Email", icon: Mail, placeholder: "e.g. name@example.com" },
    { key: "idNumber" as const, label: "Add ID Number", icon: CreditCard, placeholder: "e.g. 8801015678083" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground text-lg">Create New File</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto min-h-0">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Is this file for a Business or an Individual?</p>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
                { t: "Business" as const, icon: Building2, desc: "Business or Organisation" },
                { t: "Individual" as const, icon: User, desc: "Individual Person" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.t}
                  onClick={() => setType(opt.t)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    type === opt.t ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <opt.icon className="h-8 w-8 mx-auto mb-2 text-foreground" />
                  <span className="text-sm font-medium text-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {type && (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "Business" ? "Business or organisation name" : "Full name"}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}

          {type && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-foreground">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  Reference <span className="text-xs font-normal text-muted-foreground">(unique, e.g. student number, case ref)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto-generate</span>
                  <Switch checked={autoGenerateRef} onCheckedChange={setAutoGenerateRef} />
                </div>
              </div>
              {autoGenerateRef ? (
                <div className="px-4 py-2.5 rounded-xl border border-border bg-muted/30 font-mono text-sm text-foreground">
                  {generatedRef}
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    value={manualReference}
                    onChange={(e) => {
                      setManualReference(e.target.value);
                      setRefDuplicateWarning(false);
                    }}
                    onBlur={() => manualReference.trim() && checkDuplicate(manualReference.trim())}
                    placeholder={`e.g. ${formatExample} (student number, solar ID, case ref)`}
                    className="font-mono"
                  />
                  {refDuplicateWarning && (
                    <p className="text-xs text-destructive">A file with this reference already exists.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {extraFields.filter((e) => !extras[e.key]).map((e) => (
              <button
                type="button"
                key={e.key}
                onClick={() => setExtras((prev) => ({ ...prev, [e.key]: true }))}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> {e.label}
              </button>
            ))}
          </div>
          {extraFields.filter((e) => extras[e.key]).map((e) => (
            <input
              key={e.key}
              value={values[e.key]}
              onChange={(ev) => setValues((prev) => ({ ...prev, [e.key]: ev.target.value }))}
              placeholder={e.placeholder}
              className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 animate-fade-in"
            />
          ))}

          <Button
            variant="gold"
            className="w-full h-11"
            onClick={handleCreate}
            disabled={!name.trim() || !type || (!!referenceValue && refDuplicateWarning)}
          >
            Create File
          </Button>
        </div>
      </div>
    </div>
  );
}
