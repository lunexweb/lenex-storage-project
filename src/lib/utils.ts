import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClientFile } from "@/data/mockData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns a valid UUID v4 for use with Postgres uuid columns. */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** True if str is a valid UUID (so safe to send to Postgres uuid columns). */
export function isValidUUID(str: string | undefined): boolean {
  return typeof str === "string" && UUID_REGEX.test(str);
}

/** Sum all sizeInBytes from every file in every project/folder. Skips undefined. */
export function calculateTotalStorageBytes(files: ClientFile[]): number {
  let total = 0;
  for (const f of files) {
    for (const p of f.projects) {
      for (const fo of p.folders) {
        for (const fi of fo.files) {
          if (typeof fi.sizeInBytes === "number") total += fi.sizeInBytes;
        }
      }
    }
  }
  return total;
}

/** Human-readable size from bytes. */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

const PROTECTED_EXTS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico",
  ".pdf",
  ".doc", ".docx",
  ".xls", ".xlsx", ".csv",
  ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v",
  ".mp3", ".wav", ".ogg", ".m4a",
  ".zip", ".rar", ".7z",
];

/** True if filename has a known extension (e.g. .png, .pdf). Extension must be preserved when editing. */
export function hasProtectedExtension(name: string): boolean {
  if (!name || !name.includes(".")) return false;
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return PROTECTED_EXTS.includes(ext);
}

/** Part before the last dot (e.g. "fjflla" from "fjflla.png"). If no dot, returns name. */
export function getBasename(name: string): string {
  if (!name) return "";
  const i = name.lastIndexOf(".");
  return i <= 0 ? name : name.slice(0, i);
}

/** Extension including the dot (e.g. ".png"), or "" if none. */
export function getExtension(name: string): string {
  if (!name || !name.includes(".")) return "";
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

/** Safe name when saving: for protected extensions, keeps original extension and only allows editing the basename. */
export function preserveExtensionName(originalName: string, userInput: string): string {
  const trimmed = userInput.trim();
  if (!trimmed) return originalName;
  if (!hasProtectedExtension(originalName)) return trimmed;
  const ext = getExtension(originalName);
  let base = trimmed;
  const lastDot = base.lastIndexOf(".");
  if (lastDot > 0) base = base.slice(0, lastDot).trim();
  return base ? base + ext : originalName;
}
