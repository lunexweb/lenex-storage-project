import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";

export interface CompleteConfirmModalProps {
  title: string;
  projectName: string;
  confirmPhrase: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function CompleteConfirmModal({
  title,
  projectName,
  confirmPhrase,
  onConfirm,
  onCancel,
  isOpen,
}: CompleteConfirmModalProps) {
  const { profile } = useSettings();
  const businessName = profile.businessNameOrUserName || "";
  const [businessInput, setBusinessInput] = useState("");
  const [phraseInput, setPhraseInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setBusinessInput("");
      setPhraseInput("");
    }
  }, [isOpen]);

  const canConfirm =
    businessInput.trim() === businessName.trim() &&
    phraseInput.trim() === confirmPhrase.trim();

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    onCancel();
    toast.success(`"${projectName}" marked as completed`, {
      classNames: {
        toast: "border-completed bg-completed/10 text-completed",
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm marking this project as completed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto min-h-0 flex-1">
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/30 font-medium">
            Marking this project as completed will lock it. You will no longer be able to add or edit fields, folders, or files. This is a significant status change.
          </div>
          <div>
            <Label htmlFor="complete-confirm-business" className="text-sm">
              To confirm, type your business name{" "}
              {businessName ? (
                <span className="font-semibold">"{businessName}"</span>
              ) : null}
              .
            </Label>
            <Input
              id="complete-confirm-business"
              value={businessInput}
              onChange={(e) => setBusinessInput(e.target.value)}
              placeholder={businessName}
              className="mt-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="complete-confirm-phrase" className="text-sm">
              To confirm, type "{confirmPhrase}".
            </Label>
            <Input
              id="complete-confirm-phrase"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder={confirmPhrase}
              className="mt-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary"
              autoComplete="off"
            />
          </div>
          <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Completed projects are read-only. You can still view and share them. If you need to make changes later, contact support or restore from a backup if available.
            </span>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between shrink-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            className={
              canConfirm
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Mark as completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
