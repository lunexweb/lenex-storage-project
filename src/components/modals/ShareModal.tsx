import { useState, useEffect, useRef } from "react";
import { X, Copy, Check, MessageCircle, Mail, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { useSettings } from "@/context/SettingsContext";
import { generateFilePDF } from "@/lib/generatePDF";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";
import { toast } from "sonner";
import type { Project } from "@/data/mockData";

export interface StoredShare {
  code: string;
  projects: string[];
  folders: string[];
}

function generateAccessCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `STOR-${n}`;
}

interface ShareModalProps {
  fileId: string;
  onClose: () => void;
}

function getAllProjectIds(projects: Project[]): string[] {
  return projects.map((p) => p.id);
}

function getAllFolderIds(projects: Project[]): string[] {
  return projects.flatMap((p) => p.folders.map((f) => f.id));
}

export default function ShareModal({ fileId, onClose }: ShareModalProps) {
  const { files, folderFilesLoaded } = useData();
  const { profile } = useSettings();
  const file = files.find((f) => f.id === fileId);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [accessCode, setAccessCode] = useState<string>(() => generateAccessCode());

  const allProjectIds = file ? getAllProjectIds(file.projects) : [];
  const allFolderIds = file ? getAllFolderIds(file.projects) : [];
  const [selectedProjects, setSelectedProjects] = useState<string[]>(() => allProjectIds);
  const [selectedFolders, setSelectedFolders] = useState<string[]>(() => allFolderIds);

  const masterCheckRef = useRef<HTMLInputElement>(null);

  const token = file ? (file.reference || file.id) : "";
  const shareLink = file
    ? `${window.location.origin}/portal?token=${encodeURIComponent(token)}`
    : "";

  const totalProjects = allProjectIds.length;
  const totalFolders = allFolderIds.length;
  const allSelected = selectedProjects.length === totalProjects && selectedFolders.length === totalFolders;
  const someSelected = selectedProjects.length > 0 || selectedFolders.length > 0;
  const masterIndeterminate = someSelected && !allSelected;

  useEffect(() => {
    if (masterCheckRef.current) {
      masterCheckRef.current.checked = allSelected;
      masterCheckRef.current.indeterminate = masterIndeterminate;
    }
  }, [allSelected, masterIndeterminate]);

  const isProjectFullyChecked = (project: Project) =>
    project.folders.every((f) => selectedFolders.includes(f.id));
  const isProjectSomeChecked = (project: Project) =>
    project.folders.some((f) => selectedFolders.includes(f.id));
  const isProjectIndeterminate = (project: Project) =>
    isProjectSomeChecked(project) && !isProjectFullyChecked(project);

  const toggleMaster = () => {
    if (allSelected) {
      setSelectedProjects([]);
      setSelectedFolders([]);
    } else {
      setSelectedProjects([...allProjectIds]);
      setSelectedFolders([...allFolderIds]);
    }
  };

  const toggleProject = (project: Project) => {
    const folderIds = project.folders.map((f) => f.id);
    const allIn = folderIds.every((id) => selectedFolders.includes(id));
    if (allIn) {
      setSelectedFolders((prev) => prev.filter((id) => !folderIds.includes(id)));
      setSelectedProjects((prev) => prev.filter((id) => id !== project.id));
    } else {
      setSelectedFolders((prev) => [...new Set([...prev, ...folderIds])]);
      setSelectedProjects((prev) => (prev.includes(project.id) ? prev : [...prev, project.id]));
    }
  };

  const toggleFolder = (folderId: string, project: Project) => {
    const inSelected = selectedFolders.includes(folderId);
    setSelectedFolders((prev) =>
      inSelected ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
    const folderIds = project.folders.map((f) => f.id);
    const willRemain = inSelected
      ? selectedFolders.filter((id) => id !== folderId && folderIds.includes(id))
      : [...selectedFolders.filter((id) => !folderIds.includes(id)), folderId];
    const projectStillHasFolders = folderIds.some((id) => willRemain.includes(id));
    if (!projectStillHasFolders) {
      setSelectedProjects((prev) => prev.filter((id) => id !== project.id));
    } else if (!selectedProjects.includes(project.id)) {
      setSelectedProjects((prev) => [...prev, project.id]);
    }
  };

  useEffect(() => {
    if (file) {
      setSelectedProjects(getAllProjectIds(file.projects));
      setSelectedFolders(getAllFolderIds(file.projects));
    }
  }, [file?.id]);

  useEffect(() => {
    if (!accessCode || !token || !fileId || selectedProjects.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        await supabase.from("shares").upsert(
          {
            token,
            code: accessCode,
            client_file_id: fileId,
            project_ids: selectedProjects,
            folder_ids: selectedFolders,
            user_id: user.id,
            is_active: true,
          },
          { onConflict: "token" }
        );
      } catch (err) {
        if (!cancelled) toast.error(mapSupabaseError(err));
      }
    })();
    return () => { cancelled = true; };
  }, [accessCode, token, fileId, selectedProjects, selectedFolders]);

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const shareSummaryLine =
    `You have been given access to ${selectedProjects.length} project${selectedProjects.length !== 1 ? "s" : ""} and ${selectedFolders.length} folder${selectedFolders.length !== 1 ? "s" : ""}.`;
  // Wrap link in angle brackets so WhatsApp and email clients reliably detect it as clickable
  const whatsappMessage = `Here is your secure Lunex file. Tap the link below to view your documents.\n\n<${shareLink}>\n\nAccess Code: ${accessCode}\nYou will need this code to open the file.\n${shareSummaryLine}`;
  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank");
  };

  const businessName = profile.businessNameOrUserName?.trim() || "Lunex.com";
  const emailSubject = `Your secure file from ${businessName}`;
  const emailBody = `Here is your secure Lunex file. Tap the link below to view your documents.\n\n<${shareLink}>\n\nAccess Code: ${accessCode}\nYou will need this code to open the file.\n${shareSummaryLine}\n\nOpen the link above and enter your access code to view your shared files.`;
  const openEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  };

  const canShare = selectedProjects.length > 0;

  const handleDownloadPDF = async () => {
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

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground text-lg">Share with Client</h2>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 max-lg:p-3 hover:bg-muted rounded" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleDownloadPDF}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
          </Button>

          <div>
            <h3 className="font-medium text-foreground">Choose what to share</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your client will only see what you select.</p>
            <div className="mt-3 space-y-1 border border-border rounded-lg p-3 bg-muted/20 max-h-48 overflow-y-auto">
              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  ref={masterCheckRef}
                  type="checkbox"
                  onChange={toggleMaster}
                  className="rounded border-input"
                />
                <span className="font-medium text-foreground text-sm">{file.name}</span>
              </label>
              {file.projects.map((project) => (
                <div key={project.id} className="pl-5 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isProjectFullyChecked(project)}
                      ref={(el) => {
                        if (el) el.indeterminate = isProjectIndeterminate(project);
                      }}
                      onChange={() => toggleProject(project)}
                      className="rounded border-input"
                    />
                    <span className="text-sm text-foreground">{project.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {project.projectNumber || project.id}
                    </span>
                  </label>
                  {project.folders.map((folder) => (
                    <label
                      key={folder.id}
                      className="flex items-center gap-2 cursor-pointer py-1 pl-5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFolders.includes(folder.id)}
                        onChange={() => toggleFolder(folder.id, project)}
                        className="rounded border-input"
                      />
                      <span className="text-sm text-foreground">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {folderFilesLoaded ? `${folder.files.length} files` : "…"}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Currently sharing: {selectedProjects.length} project{selectedProjects.length !== 1 ? "s" : ""} and{" "}
              {selectedFolders.length} folder{selectedFolders.length !== 1 ? "s" : ""}.
            </p>
          </div>

          <div className="border-t border-border pt-4" />
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-900">
            Sharing {selectedProjects.length} project{selectedProjects.length !== 1 ? "s" : ""} and{" "}
            {selectedFolders.length} folder{selectedFolders.length !== 1 ? "s" : ""} with your client.
          </div>

          {!canShare && (
            <p className="text-sm text-orange-600">
              Please select at least one project or folder to share.
            </p>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-1">Share link</label>
            <div className="flex items-center gap-2">
              <input
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm font-mono text-muted-foreground"
              />
              <Button size="sm" variant="outline" onClick={copyLink} disabled={!canShare}>
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-success" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Access code</label>
            <p className="text-xl font-bold font-mono text-foreground mb-2">{accessCode}</p>
            <Button size="sm" variant="outline" onClick={copyCode} disabled={!canShare}>
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-success" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy Code
                </>
              )}
            </Button>
          </div>
          <Button
            size="sm"
            className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
            onClick={openWhatsApp}
            disabled={!canShare}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1" /> Share via WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            onClick={openEmail}
            disabled={!canShare}
          >
            <Mail className="h-3.5 w-3.5 mr-1" /> Share via Email
          </Button>
        </div>
      </div>
    </div>
  );
}
