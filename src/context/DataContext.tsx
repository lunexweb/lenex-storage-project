import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import {
  ClientFile,
  Project,
  Field,
  Folder,
  FolderFile,
  Template,
  TemplateField,
  TemplateFolderDef,
  NoteEntry,
  initialFiles,
  initialTemplates,
} from "@/data/mockData";
import { supabase } from "@/lib/supabase";
import { mapSupabaseError } from "@/lib/supabaseError";
import { formatStorageSize, generateUUID, isValidUUID } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export interface ActivityEntry {
  id: string;
  action: string;
  target: string;
  fileId: string;
  time: string;
  createdAt: string;
}

export interface FormSubmissionRow {
  id: string;
  template_id: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitted_at: string;
  field_values: Record<string, string>;
  status: "pending" | "imported" | "rejected";
  client_file_id: string | null;
  project_id: string | null;
}

interface DataContextType {
  files: ClientFile[];
  templates: Template[];
  activities: ActivityEntry[];
  loading: boolean;
  /** False until folder file counts have been loaded (avoids showing "0" while loading). */
  folderFilesLoaded: boolean;
  addFile: (file: ClientFile) => Promise<string | undefined>;
  updateFile: (id: string, updates: Partial<ClientFile>) => void;
  deleteFile: (fileId: string) => void;
  addProject: (fileId: string, project: Project) => void;
  updateProject: (fileId: string, projectId: string, updates: Partial<Project>) => void;
  deleteProject: (fileId: string, projectId: string) => void;
  addField: (fileId: string, projectId: string, field: Field) => void;
  updateField: (fileId: string, projectId: string, fieldId: string, updates: Partial<Field>) => void;
  deleteField: (fileId: string, projectId: string, fieldId: string) => void;
  addFolder: (fileId: string, projectId: string, folder: Folder) => void;
  deleteFolder: (fileId: string, projectId: string, folderId: string) => void;
  addFileToFolder: (fileId: string, projectId: string, folderId: string, file: FolderFile) => Promise<void>;
  /** Fetches folder_files for one folder from Supabase and updates only that folder in local state. */
  syncFolderFiles: (folderId: string) => Promise<void>;
  updateFileInFolder: (fileId: string, projectId: string, folderId: string, folderFileId: string, updates: Partial<FolderFile>) => void;
  deleteFileFromFolder: (fileId: string, projectId: string, folderId: string, folderFileId: string) => void;
  updateNotes: (fileId: string, projectId: string, notes: string) => void;
  setNoteEntries: (fileId: string, projectId: string, entries: NoteEntry[]) => void;
  addNoteEntry: (fileId: string, projectId: string, entry: NoteEntry) => void;
  updateNoteEntry: (fileId: string, projectId: string, entryId: string, updates: Partial<NoteEntry>) => void;
  deleteNoteEntry: (fileId: string, projectId: string, entryId: string) => void;
  addTemplate: (template: Template) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  generateFormShare: (templateId: string) => Promise<{ token: string; code: string } | undefined>;
  getFormSubmissions: (templateId: string) => Promise<FormSubmissionRow[]>;
  importFormSubmission: (submissionId: string, fileId: string, projectId: string) => Promise<void>;
  nextProjectId: () => string;
  recordActivity: (action: string, target: string, fileId: string) => void;
  /** Returns a new signed URL for the given storage path, or null on failure. */
  refreshFileUrl: (storagePath: string) => Promise<string | null>;
  /** Total bytes used by all folder files across all projects. */
  getTotalStorageUsed: () => number;
  /** Storage limit per account in bytes (100 MB). */
  STORAGE_LIMIT_BYTES: number;
}

const BUCKET = "lunex-files";
const STORAGE_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB

function getTotalStorageUsedFromFiles(files: ClientFile[]): number {
  let total = 0;
  for (const f of files) {
    for (const p of f.projects ?? []) {
      for (const fo of p.folders ?? []) {
        for (const ff of fo.files ?? []) {
          const bytes = ff.sizeInBytes;
          if (bytes != null && typeof bytes === "number") total += bytes;
        }
      }
    }
  }
  return total;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function rowToFolderFile(r: Record<string, unknown>): FolderFile {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    fileType: (r.file_type as FolderFile["fileType"]) ?? "other",
    size: String(r.size ?? "0"),
    sizeInBytes: typeof r.size_in_bytes === "number" ? r.size_in_bytes : undefined,
    uploadDate: String(r.upload_date ?? ""),
    url: r.url != null ? String(r.url) : undefined,
    storagePath: r.storage_path != null ? String(r.storage_path) : undefined,
  };
}

function rowToField(r: Record<string, unknown>): Field {
  return { id: String(r.id), name: String(r.name ?? ""), value: String(r.value ?? "") };
}

function rowToNoteEntry(r: Record<string, unknown>): NoteEntry {
  return {
    id: String(r.id),
    date: String(r.date ?? ""),
    heading: String(r.heading ?? ""),
    subheading: String(r.subheading ?? ""),
    content: String(r.content ?? ""),
  };
}

function rowToFolder(r: Record<string, unknown>, files: FolderFile[]): Folder {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: (r.type as Folder["type"]) ?? "general",
    files,
  };
}

function rowToProject(
  r: Record<string, unknown>,
  fields: Field[],
  folders: Folder[],
  noteEntries: NoteEntry[]
): Project {
  return {
    id: String(r.id),
    projectNumber: r.project_number != null ? String(r.project_number) : undefined,
    name: String(r.name ?? ""),
    status: (r.status as Project["status"]) ?? "Live",
    dateCreated: String(r.date_created ?? ""),
    completedDate: r.completed_date != null ? String(r.completed_date) : undefined,
    description: r.description != null ? String(r.description) : undefined,
    fields,
    folders,
    notes: String(r.notes ?? ""),
    noteEntries,
  };
}

function rowToClientFile(r: Record<string, unknown>, projects: Project[]): ClientFile {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    type: (r.type as ClientFile["type"]) ?? "Individual",
    phone: r.phone != null ? String(r.phone) : undefined,
    email: r.email != null ? String(r.email) : undefined,
    idNumber: r.id_number != null ? String(r.id_number) : undefined,
    reference: r.reference != null ? String(r.reference) : undefined,
    dateCreated: String(r.date_created ?? ""),
    lastUpdated: String(r.last_updated ?? ""),
    projects,
    shared: Boolean(r.shared),
  };
}

function rowToTemplateField(r: Record<string, unknown>, displayOrder: number): TemplateField {
  const type = (r.field_type as TemplateField["type"]) ?? "text";
  const options = r.options != null ? (Array.isArray(r.options) ? (r.options as string[]) : []) : undefined;
  return {
    id: String(r.id),
    type,
    label: String(r.name ?? ""),
    placeholder: r.placeholder != null ? String(r.placeholder) : undefined,
    required: Boolean(r.required),
    options: options?.length ? options : undefined,
    termsText: r.terms_text != null ? String(r.terms_text) : undefined,
    displayOrder,
  };
}

function rowToTemplate(
  r: Record<string, unknown>,
  fields: TemplateField[],
  folders: TemplateFolderDef[]
): Template {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    description: r.description != null ? String(r.description) : undefined,
    fields,
    folders,
    isShareable: Boolean(r.is_shareable),
    shareToken: r.share_token != null ? String(r.share_token) : undefined,
    shareCode: r.share_code != null ? String(r.share_code) : undefined,
  };
}

function rowToActivity(r: Record<string, unknown>): ActivityEntry {
  const createdAt = r.created_at != null ? String(r.created_at) : "";
  return {
    id: String(r.id),
    action: String(r.action ?? ""),
    target: String(r.target ?? ""),
    fileId: String(r.file_id ?? ""),
    time: "Just now",
    createdAt,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<ClientFile[]>(initialFiles);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderFilesLoaded, setFolderFilesLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setFolderFilesLoaded(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFiles(initialFiles);
        setTemplates(initialTemplates);
        setActivities([]);
        setLoading(false);
        setFolderFilesLoaded(true);
        return;
      }
      const uid = user.id;

      const [filesRes, templatesRes, templateFieldsRes, templateFoldersRes, activitiesRes] = await Promise.all([
        supabase.from("client_files").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("templates").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("template_fields").select("*"),
        supabase.from("template_folders").select("*"),
        supabase.from("activities").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      ]);

      if (filesRes.error) throw filesRes.error;
      if (templatesRes.error) throw templatesRes.error;
      if (templateFieldsRes.error) throw templateFieldsRes.error;
      if (templateFoldersRes.error) throw templateFoldersRes.error;
      if (activitiesRes.error) throw activitiesRes.error;

      const fileRows = (filesRes.data ?? []) as Record<string, unknown>[];
      const fileIds = fileRows.map((r) => String(r.id));

      const [projectsRes, fieldsRes, foldersRes, noteEntriesRes] = await Promise.all([
        fileIds.length ? supabase.from("projects").select("*").in("client_file_id", fileIds) : { data: [] as Record<string, unknown>[] },
        fileIds.length ? supabase.from("fields").select("*") : { data: [] as Record<string, unknown>[] },
        fileIds.length ? supabase.from("folders").select("*") : { data: [] as Record<string, unknown>[] },
        fileIds.length ? supabase.from("note_entries").select("*") : { data: [] as Record<string, unknown>[] },
      ]);

      const projectRows = (projectsRes.data ?? []) as Record<string, unknown>[];
      const folderRows = (foldersRes.data ?? []) as Record<string, unknown>[];
      const folderIds = folderRows.map((r) => String(r.id));

      const fieldsByProject = new Map<string, Field[]>();
      ((fieldsRes.data ?? []) as Record<string, unknown>[]).forEach((r) => {
        const pid = String(r.project_id);
        if (!fieldsByProject.has(pid)) fieldsByProject.set(pid, []);
        fieldsByProject.get(pid)!.push(rowToField(r));
      });

      const foldersByProject = new Map<string, Folder[]>();
      folderRows.forEach((r) => {
        const pid = String(r.project_id);
        foldersByProject.set(pid, [...(foldersByProject.get(pid) ?? []), rowToFolder(r, [])]);
      });

      const noteEntriesByProject = new Map<string, NoteEntry[]>();
      ((noteEntriesRes.data ?? []) as Record<string, unknown>[]).forEach((r) => {
        const pid = String(r.project_id);
        if (!noteEntriesByProject.has(pid)) noteEntriesByProject.set(pid, []);
        noteEntriesByProject.get(pid)!.push(rowToNoteEntry(r));
      });

      const projectsByFile = new Map<string, Project[]>();
      projectRows.forEach((r) => {
        const fid = String(r.client_file_id);
        const fields = fieldsByProject.get(String(r.id)) ?? [];
        const folders = foldersByProject.get(String(r.id)) ?? [];
        const noteEntries = noteEntriesByProject.get(String(r.id)) ?? [];
        const project = rowToProject(r, fields, folders, noteEntries);
        projectsByFile.set(fid, [...(projectsByFile.get(fid) ?? []), project]);
      });

      const filesList: ClientFile[] = fileRows.map((r) => rowToClientFile(r, projectsByFile.get(String(r.id)) ?? []));
      setFiles(filesList);

      const tmplRows = (templatesRes.data ?? []) as Record<string, unknown>[];
      const tfRows = ((templateFieldsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
        ...r,
        display_order: typeof r.display_order === "number" ? r.display_order : 0,
      }));
      const tfByTmpl = new Map<string, TemplateField[]>();
      tfRows
        .sort((a, b) => (a.display_order as number) - (b.display_order as number))
        .forEach((r) => {
          const tid = String(r.template_id);
          if (!tfByTmpl.has(tid)) tfByTmpl.set(tid, []);
          const order = typeof r.display_order === "number" ? r.display_order : tfByTmpl.get(tid)!.length;
          tfByTmpl.get(tid)!.push(rowToTemplateField(r, order));
        });
      const tfoByTmpl = new Map<string, TemplateFolderDef[]>();
      ((templateFoldersRes.data ?? []) as Record<string, unknown>[]).forEach((r) => {
        const tid = String(r.template_id);
        if (!tfoByTmpl.has(tid)) tfoByTmpl.set(tid, []);
        tfoByTmpl.get(tid)!.push({ name: String(r.name ?? ""), type: (r.type as TemplateFolderDef["type"]) ?? "general" });
      });
      const templatesList: Template[] = tmplRows.map((r) =>
        rowToTemplate(r, tfByTmpl.get(String(r.id)) ?? [], tfoByTmpl.get(String(r.id)) ?? [])
      );
      setTemplates(templatesList);

      const activitiesList = ((activitiesRes.data ?? []) as Record<string, unknown>[]).map(rowToActivity);
      setActivities(activitiesList);

      setLoading(false);

      if (folderIds.length) {
        const folderFilesRes = await supabase.from("folder_files").select("*").in("folder_id", folderIds);
        const folderFileRows = (folderFilesRes.data ?? []) as Record<string, unknown>[];
        const folderFilesByFolder = new Map<string, FolderFile[]>();
        folderFileRows.forEach((r) => {
          const fid = String(r.folder_id);
          if (!folderFilesByFolder.has(fid)) folderFilesByFolder.set(fid, []);
          folderFilesByFolder.get(fid)!.push(rowToFolderFile(r));
        });
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            projects: f.projects.map((p) => ({
              ...p,
              folders: p.folders.map((folder) => ({
                ...folder,
                files: folderFilesByFolder.get(folder.id) ?? folder.files,
              })),
            })),
          }))
        );
      }
      setFolderFilesLoaded(true);
    } catch (err) {
      toast.error(mapSupabaseError(err));
      // Do not reset files/templates - keep current state so the user stays on the project page
      setFolderFilesLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchData();
    const debouncedRefetch = () => {
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
      refetchTimeoutRef.current = setTimeout(() => {
        refetchTimeoutRef.current = null;
        fetchData();
      }, 100);
    };
    const channel = supabase
      .channel("data-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_files" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "fields" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "folders" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "folder_files" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "note_entries" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "templates" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, debouncedRefetch)
      .subscribe();
    return () => {
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
      supabase.removeAllChannels();
    };
  }, [fetchData]);

  // Refetch when user logs in so existing data always shows (fixes empty state after login)
  useEffect(() => {
    if (user?.email) fetchData();
  }, [user?.email, fetchData]);

  const runAndRefetch = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn();
        fetchData().catch(() => {});
        return result;
      } catch (err) {
        toast.error(mapSupabaseError(err));
        return undefined;
      }
    },
    [fetchData]
  );

  const getUserId = useCallback(async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    return user.id;
  }, []);

  const nextProjectId = useCallback((): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    const hex = "0123456789abcdef";
    const r = (n: number) => {
      let s = "";
      for (let i = 0; i < n; i++) s += hex[Math.floor(Math.random() * 16)];
      return s;
    };
    return `${r(8)}-${r(4)}-4${r(3)}-${["8", "9", "a", "b"][Math.floor(Math.random() * 4)]}${r(3)}-${r(12)}`;
  }, []);

  const recordActivity = useCallback(
    async (action: string, target: string, fileId: string) => {
      try {
        const uid = await getUserId();
        await supabase.from("activities").insert({ user_id: uid, action, target, file_id: fileId });
        setActivities((prev) => [
          { id: `act-${Date.now()}`, action, target, fileId, time: "Just now", createdAt: new Date().toISOString() },
          ...prev.slice(0, 49),
        ]);
      } catch {
        // ignore
      }
    },
    [getUserId]
  );

  const addFile = useCallback(
    (file: ClientFile) =>
      runAndRefetch(async () => {
        const uid = await getUserId();
        const { data, error } = await supabase
          .from("client_files")
          .insert({
            user_id: uid,
            name: file.name,
            type: file.type,
            phone: file.phone ?? null,
            email: file.email ?? null,
            id_number: file.idNumber ?? null,
            reference: file.reference ?? null,
            date_created: file.dateCreated,
            last_updated: file.lastUpdated,
            shared: file.shared ?? false,
          })
          .select()
          .single();
        if (error) throw error;
        const id = data ? String(data.id) : undefined;
        if (id) recordActivity("Created file", file.name, id);
        return id;
      }),
    [runAndRefetch, getUserId, recordActivity]
  );

  const updateFile = useCallback(
    (id: string, updates: Partial<ClientFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id !== id ? f : { ...f, ...updates }))
      );
      return runAndRefetch(async () => {
        const row: Record<string, unknown> = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.type !== undefined) row.type = updates.type;
        if (updates.phone !== undefined) row.phone = updates.phone;
        if (updates.email !== undefined) row.email = updates.email;
        if (updates.idNumber !== undefined) row.id_number = updates.idNumber;
        if (updates.reference !== undefined) row.reference = updates.reference;
        if (updates.lastUpdated !== undefined) row.last_updated = updates.lastUpdated;
        if (updates.shared !== undefined) row.shared = updates.shared;
        if (Object.keys(row).length === 0) return;
        const { error } = await supabase.from("client_files").update(row).eq("id", id);
        if (error) throw error;
      });
    },
    [runAndRefetch]
  );

  const deleteFile = useCallback(
    (fileId: string) => {
      const file = files.find((f) => f.id === fileId);
      if (file) recordActivity("Deleted file", file.name, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      return runAndRefetch(async () => {
        const { error } = await supabase.from("client_files").delete().eq("id", fileId);
        if (error) throw error;
      });
    },
    [runAndRefetch, files, recordActivity]
  );

  const addProject = useCallback(
    (fileId: string, project: Project) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId ? f : { ...f, projects: [...f.projects, project] }
        )
      );
      return runAndRefetch(async () => {
        const uid = await getUserId();
        const payload = {
          id: project.id,
          client_file_id: fileId,
          user_id: uid,
          project_number: project.projectNumber ?? null,
          name: project.name,
          status: project.status,
          date_created: project.dateCreated,
          completed_date: project.completedDate ?? null,
          description: project.description ?? null,
          notes: project.notes ?? "",
        };
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
        recordActivity("Added project", project.name, fileId);
        for (const field of project.fields ?? []) {
          const { error: fieldErr } = await supabase.from("fields").insert({
            id: field.id,
            project_id: project.id,
            user_id: uid,
            name: field.name,
            value: field.value ?? "",
          });
          if (fieldErr) throw fieldErr;
        }
        for (const folder of project.folders ?? []) {
          const { data: folderRow, error: folderErr } = await supabase
            .from("folders")
            .insert({
              project_id: project.id,
              user_id: uid,
              name: folder.name,
              type: folder.type,
            })
            .select()
            .single();
          if (folderErr) throw folderErr;
          if (folderRow && folder.files?.length) {
            for (const ff of folder.files) {
              await supabase.from("folder_files").insert({
                folder_id: folderRow.id,
                user_id: uid,
                name: ff.name,
                file_type: ff.fileType,
                size: ff.size,
                size_in_bytes: ff.sizeInBytes ?? null,
                upload_date: ff.uploadDate,
                url: ff.url ?? null,
              });
            }
          }
        }
      });
    },
    [runAndRefetch, getUserId, recordActivity]
  );

  const updateProject = useCallback(
    (fileId: string, projectId: string, updates: Partial<Project>) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId ? p : { ...p, ...updates }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const row: Record<string, unknown> = {};
        if (updates.projectNumber !== undefined) row.project_number = updates.projectNumber;
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.status !== undefined) row.status = updates.status;
        if (updates.dateCreated !== undefined) row.date_created = updates.dateCreated;
        if (updates.completedDate !== undefined) row.completed_date = updates.completedDate;
        if (updates.description !== undefined) row.description = updates.description;
        if (updates.notes !== undefined) row.notes = updates.notes;
        if (Object.keys(row).length === 0) return;
        const { error } = await supabase.from("projects").update(row).eq("id", projectId);
        if (error) throw error;
      });
    },
    [runAndRefetch]
  );

  const deleteProject = useCallback(
    (fileId: string, projectId: string) => {
      const file = files.find((f) => f.id === fileId);
      const project = file?.projects.find((p) => p.id === projectId);
      if (project) recordActivity("Deleted project", project.name, fileId);
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : { ...f, projects: f.projects.filter((p) => p.id !== projectId) }
        )
      );
      return runAndRefetch(async () => {
        const { error } = await supabase.from("projects").delete().eq("id", projectId);
        if (error) throw error;
      });
    },
    [runAndRefetch, files, recordActivity]
  );

  const addField = useCallback(
    (fileId: string, projectId: string, field: Field) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `f-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const newField: Field = { id, name: field.name, value: field.value ?? "" };
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId ? p : { ...p, fields: [...p.fields, newField] }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const uid = await getUserId();
        const { error } = await supabase.from("fields").insert({
          id: newField.id,
          project_id: projectId,
          user_id: uid,
          name: newField.name,
          value: newField.value ?? "",
        });
        if (error) throw error;
        recordActivity("Added field", newField.name, fileId);
      });
    },
    [runAndRefetch, getUserId, recordActivity]
  );

  const updateField = useCallback(
    (fileId: string, projectId: string, fieldId: string, updates: Partial<Field>) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : {
                        ...p,
                        fields: p.fields.map((fld) =>
                          fld.id !== fieldId ? fld : { ...fld, ...updates }
                        ),
                      }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const row: Record<string, unknown> = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.value !== undefined) row.value = updates.value;
        if (Object.keys(row).length === 0) return;
        const { error } = await supabase.from("fields").update(row).eq("id", fieldId);
        if (error) throw error;
      });
    },
    [runAndRefetch]
  );

  const deleteField = useCallback(
    (fileId: string, projectId: string, fieldId: string) => {
      const file = files.find((f) => f.id === fileId);
      const project = file?.projects.find((p) => p.id === projectId);
      const field = project?.fields.find((f) => f.id === fieldId);
      if (field) recordActivity("Deleted field", field.name, fileId);
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : { ...p, fields: p.fields.filter((fld) => fld.id !== fieldId) }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const { error } = await supabase.from("fields").delete().eq("id", fieldId);
        if (error) throw error;
      });
    },
    [runAndRefetch, files, recordActivity]
  );

  const addFolder = useCallback(
    (fileId: string, projectId: string, folder: Folder) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `fo-${Date.now()}`;
      const newFolder: Folder = { id, name: folder.name, type: folder.type, files: [] };
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : { ...p, folders: [...p.folders, newFolder] }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const uid = await getUserId();
        const { error } = await supabase.from("folders").insert({
          id,
          project_id: projectId,
          user_id: uid,
          name: folder.name,
          type: folder.type,
        });
        if (error) throw error;
        recordActivity("Added folder", folder.name, fileId);
      });
    },
    [runAndRefetch, getUserId, recordActivity]
  );

  const deleteFolder = useCallback(
    (fileId: string, projectId: string, folderId: string) => {
      const file = files.find((f) => f.id === fileId);
      const project = file?.projects.find((p) => p.id === projectId);
      const folder = project?.folders.find((f) => f.id === folderId);
      if (folder) recordActivity("Deleted folder", folder.name, fileId);
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : { ...p, folders: p.folders.filter((fo) => fo.id !== folderId) }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const { error } = await supabase.from("folders").delete().eq("id", folderId);
        if (error) throw error;
      });
    },
    [runAndRefetch, files, recordActivity]
  );

  const addFileToFolder = useCallback(
    async (fileId: string, projectId: string, folderId: string, file: FolderFile): Promise<void> => {
      const used = getTotalStorageUsedFromFiles(files);
      const incoming = file.sizeInBytes ?? 0;
      if (used + incoming > STORAGE_LIMIT_BYTES) {
        throw new Error(
          `Storage limit reached. You have used ${formatStorageSize(used)} of 100 MB. Please delete some files to free up space.`
        );
      }
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `ff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const optimisticFile: FolderFile = { ...file, id };
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : {
                        ...p,
                        folders: p.folders.map((fo) =>
                          fo.id !== folderId
                            ? fo
                            : { ...fo, files: [...fo.files, optimisticFile] }
                        ),
                      }
                ),
              }
        )
      );
      try {
        const uid = await getUserId();
        let storagePath: string | null = null;
        let urlToStore: string | null = null;

        const hasDataUrl = file.url != null && String(file.url).startsWith("data:");
        if (hasDataUrl) {
          const dataUrl = file.url!;
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const ext = file.name.split(".").pop() || "bin";
          const path = `${uid}/${folderId}/${id}.${ext}`;

          const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
          if (uploadErr) {
            console.error("Storage upload error:", uploadErr.message, uploadErr);
            throw new Error(`Failed to upload ${file.name}. Please check your connection and try again.`);
          }
          storagePath = path;

          const { data: signedData, error: signedErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 31536000);
          if (signedErr || !signedData?.signedUrl) {
            console.error("createSignedUrl error:", signedErr?.message ?? "no url", signedErr);
            throw new Error("File uploaded but preview link failed. Please refresh the page.");
          }
          urlToStore = signedData.signedUrl;
        }

        const { error } = await supabase.from("folder_files").insert({
          id,
          folder_id: folderId,
          user_id: uid,
          name: file.name,
          file_type: file.fileType,
          size: file.size,
          size_in_bytes: file.sizeInBytes ?? null,
          upload_date: file.uploadDate,
          storage_path: storagePath,
          url: urlToStore,
        });
        if (error) {
          console.error("folder_files insert error:", error.message, error.details, error.hint, error.code);
          throw error;
        }
        setFiles((prev) =>
          prev.map((f) =>
            f.id !== fileId
              ? f
              : {
                  ...f,
                  projects: f.projects.map((p) =>
                    p.id !== projectId
                      ? p
                      : {
                          ...p,
                          folders: p.folders.map((fo) =>
                            fo.id !== folderId
                              ? fo
                              : {
                                  ...fo,
                                  files: fo.files.map((ff) =>
                                    ff.id !== id ? ff : { ...ff, url: urlToStore ?? undefined }
                                  ),
                                }
                          ),
                        }
                  ),
                }
          )
        );
        recordActivity("Uploaded file", file.name, fileId);
      } catch (err) {
        toast.error(mapSupabaseError(err));
        throw err;
      }
    },
    [getUserId, recordActivity, files]
  );

  const syncFolderFiles = useCallback(async (folderId: string) => {
    const { data, error } = await supabase
      .from("folder_files")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });
    if (error || !data) return;
    setFiles((prev) =>
      prev.map((cf) => ({
        ...cf,
        projects: cf.projects.map((p) => ({
          ...p,
          folders: p.folders.map((fo) =>
            fo.id === folderId
              ? { ...fo, files: data.map((row) => rowToFolderFile(row as Record<string, unknown>)) }
              : fo
          ),
        })),
      }))
    );
  }, []);

  const updateFileInFolder = useCallback(
    (fileId: string, projectId: string, folderId: string, folderFileId: string, updates: Partial<FolderFile>) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : {
                        ...p,
                        folders: p.folders.map((fo) =>
                          fo.id !== folderId
                            ? fo
                            : {
                                ...fo,
                                files: fo.files.map((ff) =>
                                  ff.id !== folderFileId ? ff : { ...ff, ...updates }
                                ),
                              }
                        ),
                      }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const row: Record<string, unknown> = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.fileType !== undefined) row.file_type = updates.fileType;
        if (updates.size !== undefined) row.size = updates.size;
        if (updates.sizeInBytes !== undefined) row.size_in_bytes = updates.sizeInBytes;
        if (updates.uploadDate !== undefined) row.upload_date = updates.uploadDate;
        if (updates.url !== undefined) row.url = updates.url;
        if (Object.keys(row).length === 0) return;
        const { error } = await supabase.from("folder_files").update(row).eq("id", folderFileId);
        if (error) throw error;
      });
    },
    [runAndRefetch]
  );

  const deleteFileFromFolder = useCallback(
    (fileId: string, projectId: string, folderId: string, folderFileId: string) => {
      const file = files.find((f) => f.id === fileId);
      const project = file?.projects.find((p) => p.id === projectId);
      const folder = project?.folders.find((f) => f.id === folderId);
      const folderFile = folder?.files.find((f) => f.id === folderFileId);
      if (folderFile) recordActivity("Deleted file from folder", folderFile.name, fileId);
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId
                    ? p
                    : {
                        ...p,
                        folders: p.folders.map((fo) =>
                          fo.id !== folderId
                            ? fo
                            : { ...fo, files: fo.files.filter((ff) => ff.id !== folderFileId) }
                        ),
                      }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const { data: row } = await supabase.from("folder_files").select("storage_path").eq("id", folderFileId).single();
        if (row?.storage_path) {
          await supabase.storage.from(BUCKET).remove([row.storage_path]);
        }
        const { error } = await supabase.from("folder_files").delete().eq("id", folderFileId);
        if (error) throw error;
      });
    },
    [runAndRefetch, files, recordActivity]
  );

  const refreshFileUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 31536000);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }, []);

  const updateNotes = useCallback(
    (fileId: string, projectId: string, notes: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id !== fileId
            ? f
            : {
                ...f,
                projects: f.projects.map((p) =>
                  p.id !== projectId ? p : { ...p, notes }
                ),
              }
        )
      );
      return runAndRefetch(async () => {
        const { error } = await supabase.from("projects").update({ notes }).eq("id", projectId);
        if (error) throw error;
        recordActivity("Updated notes", "Notes", fileId);
      });
    },
    [runAndRefetch, recordActivity]
  );

  const setNoteEntries = useCallback(
    (fileId: string, projectId: string, entries: NoteEntry[]) =>
      runAndRefetch(async () => {
        const uid = await getUserId();
        const { data: existing } = await supabase.from("note_entries").select("id").eq("project_id", projectId);
        if (existing?.length) {
          await supabase.from("note_entries").delete().eq("project_id", projectId);
        }
        if (entries.length) {
          const rows = entries.map((e) => ({
            id: isValidUUID(e.id) ? e.id : generateUUID(),
            project_id: projectId,
            user_id: uid,
            date: e.date,
            heading: e.heading,
            subheading: e.subheading,
            content: e.content,
          }));
          const { error } = await supabase.from("note_entries").insert(rows);
          if (error) throw error;
        }
      }),
    [runAndRefetch, getUserId]
  );

  const addNoteEntry = useCallback(
    (fileId: string, projectId: string, entry: NoteEntry) =>
      runAndRefetch(async () => {
        const uid = await getUserId();
        const id = isValidUUID(entry.id) ? entry.id : generateUUID();
        const { error } = await supabase.from("note_entries").insert({
          id,
          project_id: projectId,
          user_id: uid,
          date: entry.date,
          heading: entry.heading,
          subheading: entry.subheading,
          content: entry.content,
        });
        if (error) throw error;
        recordActivity("Added note", entry.heading || "Note", fileId);
      }),
    [runAndRefetch, getUserId, recordActivity]
  );

  const updateNoteEntry = useCallback(
    (fileId: string, projectId: string, entryId: string, updates: Partial<NoteEntry>) =>
      runAndRefetch(async () => {
        const row: Record<string, unknown> = {};
        if (updates.date !== undefined) row.date = updates.date;
        if (updates.heading !== undefined) row.heading = updates.heading;
        if (updates.subheading !== undefined) row.subheading = updates.subheading;
        if (updates.content !== undefined) row.content = updates.content;
        if (Object.keys(row).length === 0) return;
        const { error } = await supabase.from("note_entries").update(row).eq("id", entryId);
        if (error) throw error;
      }),
    [runAndRefetch]
  );

  const deleteNoteEntry = useCallback(
    (fileId: string, projectId: string, entryId: string) =>
      runAndRefetch(async () => {
        const file = files.find((f) => f.id === fileId);
        const project = file?.projects.find((p) => p.id === projectId);
        const entry = project?.noteEntries?.find((e) => e.id === entryId);
        if (entry) recordActivity("Deleted note", entry.heading || "Note", fileId);
        const { error } = await supabase.from("note_entries").delete().eq("id", entryId);
        if (error) throw error;
      }),
    [runAndRefetch, files, recordActivity]
  );

  const addTemplate = useCallback(
    (template: Template) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `tmpl-${Date.now()}`;
      const newTemplate: Template = {
        ...template,
        id,
        isShareable: template.isShareable ?? false,
        shareToken: template.shareToken,
        shareCode: template.shareCode,
      };
      setTemplates((prev) => [...prev, newTemplate]);
      return runAndRefetch(async () => {
        const uid = await getUserId();
        const { error: tErr } = await supabase.from("templates").insert({
          id,
          user_id: uid,
          name: template.name,
          description: template.description ?? null,
          is_shareable: newTemplate.isShareable,
          share_token: newTemplate.shareToken ?? null,
          share_code: newTemplate.shareCode ?? null,
        });
        if (tErr) throw tErr;
        for (let i = 0; i < template.fields.length; i++) {
          const f = template.fields[i];
          await supabase.from("template_fields").insert({
            id: f.id,
            template_id: id,
            name: f.label,
            display_order: f.displayOrder,
            field_type: f.type,
            placeholder: f.placeholder ?? null,
            required: f.required,
            options: f.options?.length ? f.options : null,
            terms_text: f.termsText ?? null,
          });
        }
        for (let i = 0; i < template.folders.length; i++) {
          const fo = template.folders[i];
          await supabase.from("template_folders").insert({ template_id: id, name: fo.name, type: fo.type });
        }
        recordActivity("Created template", template.name, "");
      });
    },
    [runAndRefetch, getUserId, recordActivity]
  );

  const updateTemplate = useCallback(
    (id: string, updates: Partial<Template>) => {
      setTemplates((prev) =>
        prev.map((t) => (t.id !== id ? t : { ...t, ...updates }))
      );
      return runAndRefetch(async () => {
        const templateRow: Record<string, unknown> = {};
        if (updates.name !== undefined) templateRow.name = updates.name;
        if (updates.description !== undefined) templateRow.description = updates.description;
        if (updates.isShareable !== undefined) templateRow.is_shareable = updates.isShareable;
        if (updates.shareToken !== undefined) templateRow.share_token = updates.shareToken;
        if (updates.shareCode !== undefined) templateRow.share_code = updates.shareCode;
        if (Object.keys(templateRow).length > 0) {
          const { error } = await supabase.from("templates").update(templateRow).eq("id", id);
          if (error) throw error;
        }
        if (updates.fields !== undefined || updates.folders !== undefined) {
          await supabase.from("template_fields").delete().eq("template_id", id);
          await supabase.from("template_folders").delete().eq("template_id", id);
          const fields = updates.fields ?? (templates.find((t) => t.id === id)?.fields ?? []);
          const folders = updates.folders ?? (templates.find((t) => t.id === id)?.folders ?? []);
          for (let i = 0; i < fields.length; i++) {
            const f = fields[i];
            await supabase.from("template_fields").insert({
              id: f.id,
              template_id: id,
              name: f.label,
              display_order: f.displayOrder,
              field_type: f.type,
              placeholder: f.placeholder ?? null,
              required: f.required,
              options: f.options?.length ? f.options : null,
              terms_text: f.termsText ?? null,
            });
          }
          for (let i = 0; i < folders.length; i++) {
            const fo = folders[i];
            await supabase.from("template_folders").insert({ template_id: id, name: fo.name, type: fo.type });
          }
        }
        recordActivity("Updated template", updates.name ?? "Template", "");
      });
    },
    [runAndRefetch, templates, recordActivity]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      const t = templates.find((x) => x.id === id);
      if (t) recordActivity("Deleted template", t.name, "");
      setTemplates((prev) => prev.filter((x) => x.id !== id));
      return runAndRefetch(async () => {
        const { error } = await supabase.from("templates").delete().eq("id", id);
        if (error) throw error;
      });
    },
    [runAndRefetch, templates, recordActivity]
  );

  const generateFormShare = useCallback(
    async (templateId: string): Promise<{ token: string; code: string } | undefined> => {
      try {
        const token =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `form-${Date.now()}`;
        const code = `FORM-${Math.floor(1000 + Math.random() * 9000)}`;
        const { error } = await supabase
          .from("templates")
          .update({ is_shareable: true, share_token: token, share_code: code })
          .eq("id", templateId);
        if (error) throw error;
        setTemplates((prev) =>
          prev.map((t) =>
            t.id !== templateId ? t : { ...t, isShareable: true, shareToken: token, shareCode: code }
          )
        );
        return { token, code };
      } catch (err) {
        toast.error(mapSupabaseError(err));
        return undefined;
      }
    },
    []
  );

  const getFormSubmissions = useCallback(async (templateId: string): Promise<FormSubmissionRow[]> => {
    const { data, error } = await supabase
      .from("form_submissions")
      .select("*")
      .eq("template_id", templateId)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      template_id: String(r.template_id),
      submitter_name: r.submitter_name != null ? String(r.submitter_name) : null,
      submitter_email: r.submitter_email != null ? String(r.submitter_email) : null,
      submitted_at: String(r.submitted_at ?? ""),
      field_values: typeof r.field_values === "object" && r.field_values != null ? (r.field_values as Record<string, string>) : {},
      status: (r.status as FormSubmissionRow["status"]) ?? "pending",
      client_file_id: r.client_file_id != null ? String(r.client_file_id) : null,
      project_id: r.project_id != null ? String(r.project_id) : null,
    }));
  }, []);

  const importFormSubmission = useCallback(
    async (submissionId: string, fileId: string, projectId: string): Promise<void> => {
      const { error } = await supabase
        .from("form_submissions")
        .update({ status: "imported", client_file_id: fileId, project_id: projectId })
        .eq("id", submissionId);
      if (error) throw error;
    },
    []
  );

  const value: DataContextType = {
    files,
    templates,
    activities,
    loading,
    folderFilesLoaded,
    addFile,
    updateFile,
    deleteFile,
    addProject,
    updateProject,
    deleteProject,
    addField,
    updateField,
    deleteField,
    addFolder,
    deleteFolder,
    addFileToFolder,
    syncFolderFiles,
    updateFileInFolder,
    deleteFileFromFolder,
    updateNotes,
    setNoteEntries,
    addNoteEntry,
    updateNoteEntry,
    deleteNoteEntry,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    generateFormShare,
    getFormSubmissions,
    importFormSubmission,
    nextProjectId,
    recordActivity,
    refreshFileUrl,
    getTotalStorageUsed: () => getTotalStorageUsedFromFiles(files),
    STORAGE_LIMIT_BYTES,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
