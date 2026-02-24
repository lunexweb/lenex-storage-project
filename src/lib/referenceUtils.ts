/** Generate a unique id (for file or project). Always unique. */
export function generateUniqueId(prefix: string = "id"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Parse an example reference (e.g. "REF-001", "STU-2024-0001") into prefix and digit padding.
 */
export function parseReferenceFormat(example: string): { prefix: string; pad: number } {
  const trimmed = (example || "REF-001").trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    return { prefix: match[1], pad: Math.max(1, match[2].length) };
  }
  return { prefix: trimmed ? `${trimmed}-` : "REF-", pad: 3 };
}

/**
 * Generate the next reference given existing references and a format example.
 */
export function getNextReference(existingRefs: string[], formatExample: string): string {
  const { prefix, pad } = parseReferenceFormat(formatExample);
  const numbers = existingRefs
    .filter((r) => r && r.startsWith(prefix))
    .map((r) => {
      const tail = r.slice(prefix.length);
      return /^\d+$/.test(tail) ? parseInt(tail, 10) : 0;
    })
    .filter((n) => n > 0);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return prefix + String(next).padStart(pad, "0");
}

/**
 * Check if a reference is already used by another file (case-insensitive).
 */
export function findDuplicateReference(
  files: { id: string; reference?: string }[],
  value: string,
  excludeFileId?: string
): boolean {
  const v = (value || "").trim().toLowerCase();
  if (!v) return false;
  return files.some((f) => f.id !== excludeFileId && f.reference?.trim().toLowerCase() === v);
}

/** Collect all project numbers (projectNumber only) from files for uniqueness. */
export function getAllProjectNumbers(files: { projects: { id: string; projectNumber?: string }[] }[]): string[] {
  const refs: string[] = [];
  files.forEach((f) => f.projects.forEach((p) => p.projectNumber && refs.push(p.projectNumber)));
  return refs;
}

/** Check if a project number is already used (case-insensitive). */
export function findDuplicateProjectNumber(
  files: { projects: { id: string; projectNumber?: string }[] }[],
  value: string,
  excludeProjectId?: string
): boolean {
  const v = (value || "").trim().toLowerCase();
  if (!v) return false;
  for (const file of files) {
    for (const p of file.projects) {
      if (excludeProjectId && p.id === excludeProjectId) continue;
      if (p.projectNumber?.trim().toLowerCase() === v) return true;
    }
  }
  return false;
}

/**
 * Generate the next project number from format example. Uses only projectNumber values so each is unique.
 */
export function getNextProjectNumber(
  files: { projects: { id: string; projectNumber?: string }[] }[],
  formatExample: string
): string {
  const existing = getAllProjectNumbers(files);
  return getNextReference(existing, formatExample);
}
