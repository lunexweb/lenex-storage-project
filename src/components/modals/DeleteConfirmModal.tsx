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

export interface DeleteConfirmModalProps {
  title: string;
  itemName: string;
  confirmPhrase: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function DeleteConfirmModal({
  title,
  itemName,
  confirmPhrase,
  onConfirm,
  onCancel,
  isOpen,
}: DeleteConfirmModalProps) {
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
    businessInput === businessName && phraseInput === confirmPhrase;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    onCancel();
    toast.success(`Successfully deleted ${itemName}`, {
      classNames: {
        toast: "border-destructive bg-destructive/10 text-destructive",
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-none">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm deletion of this item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border-2 border-red-600 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-900">
            <span className="font-bold">Danger —</span> This action is permanent and cannot be undone. Once deleted, your data cannot be recovered by anyone, including Lunex.com support. Deletion is irreversible.
          </div>
          <div>
            <Label htmlFor="delete-confirm-business" className="text-sm">
              To confirm, type your business name{" "}
              {businessName ? (
                <span className="font-semibold">"{businessName}"</span>
              ) : null}
              .
            </Label>
            <Input
              id="delete-confirm-business"
              value={businessInput}
              onChange={(e) => setBusinessInput(e.target.value)}
              placeholder={businessName}
              className="mt-1"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="delete-confirm-phrase" className="text-sm">
              To confirm, type "{confirmPhrase}".
            </Label>
            <Input
              id="delete-confirm-phrase"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder={confirmPhrase}
              className="mt-1"
              autoComplete="off"
            />
          </div>
          <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              In compliance with the Protection of Personal Information Act your
              data is permanently removed from our system upon deletion and
              cannot be recovered. If you need to retain records for legal
              purposes please download or export your data before deleting.
            </span>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between shrink-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
