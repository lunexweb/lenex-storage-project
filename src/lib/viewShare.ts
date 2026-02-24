import { supabase } from "@/lib/supabase";

export type ViewShareType = "file" | "note";

export interface StoredViewShare {
  code: string;
  type: ViewShareType;
  fileId: string;
  projectId: string;
  folderId?: string;
  folderFileId?: string;
  noteId?: string;
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 32; i++) result += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < 32; i++) result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function generateViewCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `VIEW-${n}`;
}

export async function createViewShare(
  share: Omit<StoredViewShare, "code">
): Promise<{ token: string; code: string }> {
  const token = generateToken();
  const code = generateViewCode();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("You must be signed in to create a view share.");
  }

  const { error } = await supabase.from("view_shares").insert({
    user_id: user.id,
    token,
    code,
    type: share.type,
    client_file_id: share.fileId,
    project_id: share.projectId,
    folder_id: share.folderId ?? null,
    folder_file_id: share.folderFileId ?? null,
    note_entry_id: share.noteId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token, code };
}

export async function getViewShare(token: string): Promise<StoredViewShare | null> {
  const { data, error } = await supabase
    .from("view_shares")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    code: data.code,
    type: data.type as ViewShareType,
    fileId: data.client_file_id,
    projectId: data.project_id,
    folderId: data.folder_id ?? undefined,
    folderFileId: data.folder_file_id ?? undefined,
    noteId: data.note_entry_id ?? undefined,
  };
}

export function getViewShareLink(token: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/view?token=${encodeURIComponent(token)}`;
}
