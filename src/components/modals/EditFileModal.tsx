import { useState, useEffect } from "react";
import { X, Building2, User, Phone, Mail, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { findDuplicateReference } from "@/lib/referenceUtils";
import { toast } from "sonner";
import type { ClientFile } from "@/data/mockData";

export default function EditFileModal({ file, onClose }: { file: ClientFile; onClose: () => void }) {
  const { files, updateFile } = useData();
  const [name, setName] = useState(file.name);
  const [type, setType] = useState<"Business" | "Individual">(file.type);
  const [phone, setPhone] = useState(file.phone ?? "");
  const [email, setEmail] = useState(file.email ?? "");
  const [idNumber, setIdNumber] = useState(file.idNumber ?? "");
  const [reference, setReference] = useState(file.reference ?? "");
  const [refDuplicateWarning, setRefDuplicateWarning] = useState(false);

  useEffect(() => {
    setName(file.name);
    setType(file.type);
    setPhone(file.phone ?? "");
    setEmail(file.email ?? "");
    setIdNumber(file.idNumber ?? "");
    setReference(file.reference ?? "");
  }, [file.id]);

  const checkDuplicate = (value: string) => {
    setRefDuplicateWarning(!!value.trim() && findDuplicateReference(files, value.trim(), file.id));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const refTrim = reference.trim() || undefined;
    if (refTrim && findDuplicateReference(files, refTrim, file.id)) {
      toast.error("Reference already in use");
      return;
    }
    updateFile(file.id, {
      name: name.trim(),
      type,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      idNumber: idNumber.trim() || undefined,
      reference: refTrim,
    });
    toast.success("File details updated.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground text-lg">Edit File Details</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto min-h-0">
          <div>
            <Label htmlFor="edit-file-name">File name</Label>
            <Input
              id="edit-file-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Ltd"
              className="mt-1"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("Business")}
                className={`flex items-center gap-2 py-3 px-3 rounded-lg border-2 text-sm transition-colors ${
                  type === "Business"
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Building2 className="h-4 w-4" /> Business
              </button>
              <button
                type="button"
                onClick={() => setType("Individual")}
                className={`flex items-center gap-2 py-3 px-3 rounded-lg border-2 text-sm transition-colors ${
                  type === "Individual"
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <User className="h-4 w-4" /> Individual
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-file-ref" className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" /> Reference
            </Label>
            <Input
              id="edit-file-ref"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setRefDuplicateWarning(false);
              }}
              onBlur={() => checkDuplicate(reference)}
              placeholder="e.g. REF-001"
              className="mt-1 font-mono"
            />
            {refDuplicateWarning && (
              <p className="text-xs text-destructive mt-1">Reference already in use</p>
            )}
          </div>
          <div>
            <Label htmlFor="edit-file-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Phone
            </Label>
            <Input
              id="edit-file-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-file-email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </Label>
            <Input
              id="edit-file-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edit-file-id">ID number</Label>
            <Input
              id="edit-file-id"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="e.g. 8801015678083"
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
