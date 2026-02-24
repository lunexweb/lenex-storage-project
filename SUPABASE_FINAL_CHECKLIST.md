# Supabase integration — Final checklist (Step 15)

**Reference:** `SUPABASE_ROADMAP_REMAINING.md`, `SUPABASE_BUILDING_PLAN.md`

---

## 1. Checklist — Every file changed and what was done

### Step 10 — Replace view share storage with Supabase

| File | What was done |
|------|----------------|
| `src/lib/viewShare.ts` | Removed `VIEW_SHARES_STORAGE_KEY` and all `localStorage` usage. `createViewShare` is async: gets user via `supabase.auth.getUser()`, inserts into `view_shares` (user_id, token, code, type, client_file_id, project_id, folder_id, folder_file_id, note_entry_id). `getViewShare` is async: selects from `view_shares` by token, maps row to `StoredViewShare`. `getViewShareLink` unchanged. |
| `src/pages/ViewSharePage.tsx` | Load share in `useEffect` with async `getViewShare(token)`; added `loading` state and spinner; `share` type `StoredViewShare \| null`; cleanup with `cancelled` guard. |
| `src/components/modals/ShareFileModal.tsx` | `handleGenerate` async; `await createViewShare(...)`; added `generating` and `generateError` state; button shows "Generating…" and error message on failure. |
| `src/components/modals/ShareNoteModal.tsx` | Same as ShareFileModal: async `handleGenerate`, `await createViewShare`, `generating` and `generateError` with same UX. |

### Step 12 — Keep sidebar localStorage (verify only)

| File | What was done |
|------|----------------|
| *(no code change)* | Confirmed `AppLayout.tsx` uses `lunex-sidebar` only for sidebar collapsed state; per roadmap, this stays in localStorage. |

### Step 13 — Loading states (verify)

| File | What was done |
|------|----------------|
| `src/pages/DashboardPage.tsx` | Loading indicator changed from `animate-pulse` to `animate-spin` (spinner); added `aria-hidden` on spinner. |
| `src/pages/FilesPage.tsx` | Same: loading block uses `animate-spin` and `aria-hidden`. |

### Step 14 — Error handling

| File | What was done |
|------|----------------|
| `src/lib/supabaseError.ts` | **New file.** `mapSupabaseError(err)` maps to: invalid credentials → "Incorrect email or password. Please try again."; network → "Connection problem. Please check your internet and try again."; permission → "You do not have permission to do that."; other → "Something went wrong. Please try again." No raw Supabase codes in UI. |
| `src/context/AuthContext.tsx` | Replaced local `mapAuthError` with `mapSupabaseError` from `@/lib/supabaseError` for all auth toasts. |
| `src/context/DataContext.tsx` | Removed local `mapError`; import and use `mapSupabaseError` in catch for `fetchData` and `runAndRefetch`. |
| `src/context/SettingsContext.tsx` | Removed local `mapError`; import and use `mapSupabaseError` in `updateProfile` and catch. |
| `src/pages/ProjectPage.tsx` | `handleDeactivateRequest` catch uses `toast.error(mapSupabaseError(err))`. |
| `src/pages/UploadRequestPage.tsx` | `sendFiles` catch uses `mapSupabaseError(err)` for `setSendError` and `toast.error`. |
| `src/pages/ClientPortal.tsx` | `loadShare` wrapped in try/catch; on error `setShare(null)` and `toast.error(mapSupabaseError(err))`; `finally` sets `setShareLoading(false)`. `fetchFileById` promise chain has `.catch()` that sets `setFetchedFile(null)` and `toast.error(mapSupabaseError(err))`. |
| `src/components/modals/RequestFilesModal.tsx` | Catch uses `toast.error(mapSupabaseError(err))`. |
| `src/components/modals/ShareModal.tsx` | Save-share catch uses `toast.error(mapSupabaseError(err))`; added `mapSupabaseError` import. |
| `src/components/modals/ShareFileModal.tsx` | On `createViewShare` failure: `setGenerateError(msg)` and `toast.error(msg)` with `msg = mapSupabaseError(err)`; added imports. |
| `src/components/modals/ShareNoteModal.tsx` | Same as ShareFileModal for createViewShare error handling. |

### Step 15 — This document

| File | What was done |
|------|----------------|
| `SUPABASE_FINAL_CHECKLIST.md` | Created this checklist and remaining localStorage / manual follow-up notes. |

---

## 2. Remaining localStorage

| Key | Where used | Why still used |
|-----|------------|----------------|
| `lunex-sidebar` | `src/components/layout/AppLayout.tsx` | UI-only: persists sidebar collapsed/expanded state. Per roadmap (Step 12), intentionally **not** moved to Supabase. No backend or cross-device requirement. |

No other localStorage keys remain in the app for data; all former data keys (`lunex-view-shares`, `lunex-demo-settings`, `lunex-data`, etc.) have been migrated to Supabase in earlier steps.

---

## 3. Manual follow-up

- **None** — All roadmap steps through Step 15 that apply to this codebase have been implemented:
  - View shares: Supabase `view_shares` (Step 10).
  - Login/Signup and profiles on signup: verified (Step 11).
  - Sidebar: intentionally left on localStorage (Step 12).
  - Loading spinners on Dashboard and Files: verified and updated (Step 13).
  - Supabase errors wrapped in try/catch and shown via `mapSupabaseError` toasts (Step 14).

**Suggested manual checks (from roadmap test flow):**

1. Sign up → complete onboarding → create file → add project → add fields.
2. Upload an image to a folder → refresh → confirm persistence.
3. Share file → open client portal with link + code → confirm read-only view.
4. Create upload request link → open in incognito → enter code → upload files → confirm files in correct folder.
5. Create view share (file or note) → open `/view?token=...` → enter code → confirm correct file/note view.

Ensure `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and that Supabase SQL (e.g. `step2_create_tables.sql`, `step3_rls.sql`, `step8_portal_rls.sql`, `step9_upload_requests_rls.sql`) has been run in the SQL Editor if not already.
