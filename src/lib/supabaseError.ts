/**
 * Maps Supabase/auth/network errors to plain-English messages for the UI.
 * Do not expose raw Supabase error codes or messages.
 */
export function mapSupabaseError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err);
  if (/invalid.*credential|invalid login|email.*password/i.test(msg)) {
    return "Incorrect email or password. Please try again.";
  }
  if (/network|fetch|connection|failed to fetch|getaddrinfo|enotfound/i.test(msg)) {
    return "Connection problem. Please check your internet and try again.";
  }
  if (/permission|policy|row level security|rls|forbidden|unauthorized/i.test(msg)) {
    return "You do not have permission to do that.";
  }
  // Pass through specific upload/preview messages
  if (msg.startsWith("Failed to upload ") && msg.includes("Please check your connection and try again.")) return msg;
  if (msg.startsWith("File uploaded but preview link failed")) return msg;
  return "Something went wrong. Please try again.";
}
