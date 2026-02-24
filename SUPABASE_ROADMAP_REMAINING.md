# Supabase integration — remaining roadmap (for next agent)

**Reference:** Full plan is in `SUPABASE_BUILDING_PLAN.md`. Do not change UI/design; only replace localStorage with Supabase.

---

## Already done (no action)

- **Steps 1–3:** Supabase client, tables (`step2_create_tables.sql`), RLS (`step3_rls.sql`) — run in SQL Editor if not yet done.
- **Step 4:** User creates private bucket **lunex-files** in Dashboard (Storage → New bucket).
- **Step 5:** AuthContext uses Supabase Auth (login, signup, logout, session, profiles for onboarding/name).
- **Step 6:** SettingsContext loads/saves from `profiles`; no `lunex-demo-settings`.
- **Step 7:** DataContext uses Supabase for all data + Storage for file uploads; realtime; `loading` state; no `lunex-data`.
- **Step 8:** ShareModal inserts into `shares`; ClientPortal reads share by token from Supabase. RLS in `supabase/step8_portal_rls.sql` (run in SQL Editor).
- **Step 9:** RequestFilesModal → `upload_requests`; UploadRequestPage loads by token + uploads to Storage + `folder_files`; ProjectPage loads/deactivates from `upload_requests`. RLS in `supabase/step9_upload_requests_rls.sql` (run in SQL Editor).
- **@supabase/supabase-js** is installed.

---

## Step 10 — Replace view share storage with Supabase

**Goal:** Remove `lunex-view-shares` localStorage; use `view_shares` table.

**Table `view_shares`** (already in step2):  
`id`, `user_id`, `token`, `code`, `type` ('file'|'note'), `client_file_id`, `project_id`, `folder_id`, `folder_file_id`, `note_entry_id`, `created_at`.

**RLS:** Step 3 already has `public_view_share_read` (SELECT with `USING (true)`), so anon can read by token. No new SQL file needed unless you add a more restrictive policy later.

**Files to change:**

1. **`src/lib/viewShare.ts`**
   - **createViewShare(share):** Generate token + code (keep existing helpers). Insert into `view_shares`: `user_id` (from `supabase.auth.getUser()`), `token`, `code`, `type`, `client_file_id` (from share.fileId), `project_id`, `folder_id`, `folder_file_id`, `note_entry_id`. Remove all `VIEW_SHARES_STORAGE_KEY` / localStorage.
   - **getViewShare(token):** `supabase.from('view_shares').select('*').eq('token', token).single()`. Map row to `StoredViewShare` (code, type, fileId ← client_file_id, projectId, folderId, folderFileId, noteId ← note_entry_id). Return null on error or no row.
   - **getViewShareLink(token):** No change (still returns `${origin}/view?token=...`).
   - Remove export of `VIEW_SHARES_STORAGE_KEY` (or leave for backwards compat; callers should not use it).

2. **`src/pages/ViewSharePage.tsx`**
   - Currently calls `getViewShare(token)` synchronously and `setShare(getViewShare(token))`. Change to async: call `getViewShare(token)` as a Promise (if you make it async in viewShare.ts) or keep sync if getViewShare stays sync and does a client-side Supabase call that returns after await elsewhere. Prefer making `getViewShare` async and returning `Promise<StoredViewShare | null>`, then in ViewSharePage use `useEffect` + async load and set share when resolved. Show loading state while fetching.

3. **`src/components/modals/ShareFileModal.tsx`** and **`src/components/modals/ShareNoteModal.tsx`**
   - They call `createViewShare(...)` and `getViewShareLink(token)`. If `createViewShare` becomes async (Supabase insert), await it and then show the link/code. Adjust so they handle async createViewShare (e.g. async onClick handler, setGenerated after await).

**Data mapping:**  
- StoredViewShare: `fileId` → `client_file_id`, `folderFileId` → `folder_file_id`, `noteId` → `note_entry_id`.  
- view_shares columns are snake_case; map to camelCase for the app’s `StoredViewShare` interface.

---

## Step 11 — LoginPage and SignupPage (verify only)

- **LoginPage:** Form submit already calls `useAuth().login(email, password)`. No change.
- **SignupPage:** Form submit calls `useAuth().signup`. Ensure that after signup the app creates a row in `profiles` for the new user (AuthContext or SignupPage). If not already done, insert into `profiles` (id = user.id) on first signup.

---

## Step 12 — Keep sidebar localStorage

- **AppLayout.tsx:** Key `lunex-sidebar` is UI-only (sidebar collapsed state). Do **not** move to Supabase. No change.

---

## Step 13 — Loading states (verify)

- DataContext already exposes `loading`. Dashboard and Files page should show a spinner when `loading === true`. Verify; add spinner if missing.

---

## Step 14 — Error handling

- Ensure every Supabase call is in try/catch.
- Show toasts with plain-English messages:
  - Auth invalid credentials → "Incorrect email or password. Please try again."
  - Network → "Connection problem. Please check your internet and try again."
  - Permission → "You do not have permission to do that."
  - Other → "Something went wrong. Please try again."
- Do not expose raw Supabase error codes in the UI.

---

## Step 15 — Final checklist (output)

After all code changes:

1. **Checklist:** List every file changed and what was done.
2. **Remaining localStorage:** Document any keys still used (e.g. `lunex-sidebar`) and why.
3. **Manual follow-up:** Anything that could not be fully migrated.

---

## Test flow (run after all steps)

1. Sign up → complete onboarding → create file → add project → add fields.
2. Upload an image to a folder → refresh → confirm persistence.
3. Share file → open client portal with link + code → confirm read-only view.
4. Create upload request link → open in incognito → enter code → upload files → confirm files in correct folder.
5. Create view share (file or note) → open `/view?token=...` → enter code → confirm correct file/note view.

All must work with Supabase as the backend.

---

## Key paths

| What | Path |
|------|------|
| Plan | `SUPABASE_BUILDING_PLAN.md` |
| View share lib | `src/lib/viewShare.ts` |
| View share page | `src/pages/ViewSharePage.tsx` |
| Share file/note modals | `src/components/modals/ShareFileModal.tsx`, `ShareNoteModal.tsx` |
| Supabase client | `src/lib/supabase.ts` |
| Env | `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| Tables | `supabase/step2_create_tables.sql` |
| RLS | `supabase/step3_rls.sql`, `step8_portal_rls.sql`, `step9_upload_requests_rls.sql` |
