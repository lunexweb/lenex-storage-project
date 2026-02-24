export interface FolderFile {
  id: string;
  name: string;
  fileType: "pdf" | "word" | "excel" | "image" | "video" | "other";
  size: string;
  sizeInBytes?: number;
  uploadDate: string;
  /** Blob URL for preview; Supabase Storage URL when connected */
  url?: string;
  /** Storage path for signed URL refresh (e.g. user_id/folder_id/filename) */
  storagePath?: string;
}

export interface Folder {
  id: string;
  name: string;
  type: "documents" | "photos" | "videos" | "general";
  files: FolderFile[];
}

export interface Field {
  id: string;
  name: string;
  value: string;
}

/** Single daily/structured note entry: date, heading, subheading, rich-text content. */
export interface NoteEntry {
  id: string;
  date: string; // YYYY-MM-DD
  heading: string;
  subheading: string;
  content: string; // HTML for bold etc.
}

export interface Project {
  id: string;
  /** Display number for search and links (e.g. PRJ-0001). Auto-generated if not set. */
  projectNumber?: string;
  name: string;
  status: "Live" | "Pending" | "Completed";
  dateCreated: string;
  completedDate?: string;
  description?: string;
  fields: Field[];
  folders: Folder[];
  /** @deprecated Use noteEntries. Kept for backward compat. */
  notes: string;
  /** Structured daily notes (date, heading, subheading, content with formatting). */
  noteEntries?: NoteEntry[];
}

export interface ClientFile {
  id: string;
  name: string;
  type: "Business" | "Individual";
  phone?: string;
  email?: string;
  idNumber?: string;
  reference?: string;
  dateCreated: string;
  lastUpdated: string;
  projects: Project[];
  shared?: boolean;
}

export interface TemplateFolderDef {
  name: string;
  type: Folder["type"];
}

export interface Template {
  id: string;
  name: string;
  fields: string[];
  folders: TemplateFolderDef[];
}

/** Initial state for new users: no files, no templates. */
export const initialFiles: ClientFile[] = [];
export const initialTemplates: Template[] = [];

export function getFileStats(files: ClientFile[]) {
  let totalDocs = 0,
    live = 0,
    pending = 0,
    completed = 0;
  files.forEach((f) =>
    f.projects.forEach((p) => {
      if (p.status === "Live") live++;
      else if (p.status === "Pending") pending++;
      else completed++;
      p.folders.forEach((fo) => {
        totalDocs += fo.files.length;
      });
    })
  );
  return { totalDocs, live, pending, completed };
}

export function getProjectStats(project: Project) {
  let folders = project.folders.length;
  let files = 0,
    images = 0;
  project.folders.forEach((fo) =>
    fo.files.forEach((fi) => {
      if (fi.fileType === "image") images++;
      else files++;
    })
  );
  return { folders, files, images };
}

export function getFileDocCounts(file: ClientFile) {
  let docs = 0,
    images = 0,
    videos = 0;
  file.projects.forEach((p) =>
    p.folders.forEach((fo) =>
      fo.files.forEach((fi) => {
        if (fi.fileType === "image") images++;
        else if (fi.fileType === "video") videos++;
        else docs++;
      })
    )
  );
  return { docs, images, videos };
}
