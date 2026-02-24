# Supabase connection plan — Lunex application

Connect the Lunex application to Supabase. Follow every step in **exact order**. Do not skip steps. Do not change any UI, design, colors, fonts, or layout. Only replace localStorage and in-memory data with Supabase.

---

## Important rules (all steps)

- **Never change any component UI.** No design, colors, fonts, or spacing changes. The app must look and behave identically before and after Supabase. Only where data is stored and retrieved changes.
- **Every DataContext function keeps the same signature.** `addFile` still takes a `ClientFile`. `addProject` still takes `fileId` and a `Project`. Calling code does not change.
- **Complete test flow must work after all steps:** Sign up → complete onboarding → create file → add project → add fields → upload image to folder → refresh and confirm persistence → share file → open client portal with link and code (read-only) → upload via request link → confirm files appear in correct folder. All with Supabase as backend.

---

## Step 1 — Install Supabase client

1. Run in the project root:
   ```bash
   npm install @supabase/supabase-js
   ```
   *(If not already installed.)*

2. Create **src/lib/supabase.ts** with:
   ```ts
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

3. Create **.env.local** in the project root with (fill values manually):
   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```

4. Add **.env.local** to **.gitignore** if not already present.

---

## Step 2 — Create all Supabase tables

Run the following SQL in the **Supabase SQL Editor** in this exact order. Copy and paste as a single block.

```sql
-- 1. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type text,
  business_name text,
  role text,
  role_other text,
  industry text,
  reference_format_example text,
  project_number_format_example text,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. client_files
CREATE TABLE client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Business', 'Individual')),
  phone text,
  email text,
  id_number text,
  reference text,
  date_created text,
  last_updated text,
  shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_file_id uuid NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_number text,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('Live', 'Pending', 'Completed')),
  date_created text,
  completed_date text,
  description text,
  notes text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. fields
CREATE TABLE fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  value text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. folders
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('documents', 'photos', 'videos', 'general')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 6. folder_files
CREATE TABLE folder_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'word', 'excel', 'image', 'video', 'other')),
  size text,
  size_in_bytes bigint,
  upload_date text,
  storage_path text,
  url text,
  created_at timestamptz DEFAULT now()
);

-- 7. note_entries
CREATE TABLE note_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date text,
  heading text,
  subheading text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. templates
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. template_fields
CREATE TABLE template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer DEFAULT 0
);

-- 10. template_folders
CREATE TABLE template_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('documents', 'photos', 'videos', 'general'))
);

-- 11. activities
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text,
  target text,
  file_id text,
  created_at timestamptz DEFAULT now()
);

-- 12. shares
CREATE TABLE shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_file_id uuid NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  code text NOT NULL,
  project_ids text[] DEFAULT array[]::text[],
  folder_ids text[] DEFAULT array[]::text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 13. upload_requests
CREATE TABLE upload_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_file_id uuid NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  code text NOT NULL,
  request_description text,
  file_type_guidance text,
  business_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 14. view_shares (folder_id, folder_file_id, note_entry_id nullable for file vs note share)
CREATE TABLE view_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  code text NOT NULL,
  type text CHECK (type IN ('file', 'note')),
  client_file_id uuid NOT NULL REFERENCES client_files(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  folder_file_id uuid REFERENCES folder_files(id) ON DELETE SET NULL,
  note_entry_id uuid REFERENCES note_entries(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## Step 3 — Enable Row Level Security on every table

Run the following SQL in the Supabase SQL Editor as a single block.

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_shares ENABLE ROW LEVEL SECURITY;

-- profiles: use id instead of user_id
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (id = auth.uid());

-- client_files
CREATE POLICY "client_files_select" ON client_files FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "client_files_insert" ON client_files FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "client_files_update" ON client_files FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "client_files_delete" ON client_files FOR DELETE USING (user_id = auth.uid());

-- projects
CREATE POLICY "projects_select" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (user_id = auth.uid());

-- fields
CREATE POLICY "fields_select" ON fields FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fields_insert" ON fields FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fields_update" ON fields FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "fields_delete" ON fields FOR DELETE USING (user_id = auth.uid());

-- folders
CREATE POLICY "folders_select" ON folders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "folders_insert" ON folders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "folders_update" ON folders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "folders_delete" ON folders FOR DELETE USING (user_id = auth.uid());

-- folder_files: own rows + public read when folder is in active share or upload request
CREATE POLICY "folder_files_select" ON folder_files FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "folder_files_select_public" ON folder_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM shares s WHERE s.is_active AND folder_files.folder_id = ANY(s.folder_ids))
  OR EXISTS (SELECT 1 FROM upload_requests ur WHERE ur.is_active AND ur.folder_id = folder_files.folder_id)
);
CREATE POLICY "folder_files_insert" ON folder_files FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "folder_files_update" ON folder_files FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "folder_files_delete" ON folder_files FOR DELETE USING (user_id = auth.uid());

-- note_entries
CREATE POLICY "note_entries_select" ON note_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "note_entries_insert" ON note_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "note_entries_update" ON note_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "note_entries_delete" ON note_entries FOR DELETE USING (user_id = auth.uid());

-- templates
CREATE POLICY "templates_select" ON templates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "templates_insert" ON templates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates_update" ON templates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "templates_delete" ON templates FOR DELETE USING (user_id = auth.uid());

-- template_fields
CREATE POLICY "template_fields_select" ON template_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_fields.template_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_fields_insert" ON template_fields FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_fields.template_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_fields_update" ON template_fields FOR UPDATE USING (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_fields.template_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_fields_delete" ON template_fields FOR DELETE USING (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_fields.template_id AND t.user_id = auth.uid())
);

-- template_folders
CREATE POLICY "template_folders_select" ON template_folders FOR SELECT USING (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_folders.template_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_folders_insert" ON template_folders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_folders.template_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_folders_update" ON template_folders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_folders.template_id AND t.user_id = auth.uid())
);
CREATE POLICY "template_folders_delete" ON template_folders FOR DELETE USING (
  EXISTS (SELECT 1 FROM templates t WHERE t.id = template_folders.template_id AND t.user_id = auth.uid())
);

-- activities
CREATE POLICY "activities_select" ON activities FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "activities_insert" ON activities FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "activities_update" ON activities FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "activities_delete" ON activities FOR DELETE USING (user_id = auth.uid());

-- shares: own rows + public read by token when active
CREATE POLICY "shares_select" ON shares FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public_share_read" ON shares FOR SELECT USING (is_active = true);
CREATE POLICY "shares_insert" ON shares FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "shares_update" ON shares FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "shares_delete" ON shares FOR DELETE USING (user_id = auth.uid());

-- upload_requests: own rows + public read by token when active
CREATE POLICY "upload_requests_select" ON upload_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public_request_read" ON upload_requests FOR SELECT USING (is_active = true);
CREATE POLICY "upload_requests_insert" ON upload_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "upload_requests_update" ON upload_requests FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "upload_requests_delete" ON upload_requests FOR DELETE USING (user_id = auth.uid());

-- view_shares: own rows + public read by token
CREATE POLICY "view_shares_select" ON view_shares FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "public_view_share_read" ON view_shares FOR SELECT USING (true);
CREATE POLICY "view_shares_insert" ON view_shares FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "view_shares_update" ON view_shares FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "view_shares_delete" ON view_shares FOR DELETE USING (user_id = auth.uid());
```

**Note:** For `shares`, `upload_requests`, and `view_shares`, the "public" policies allow any user (including anon) to SELECT. Application code must filter by token when reading for portal/request/view pages. The `public_share_read` and `public_request_read` policies use `is_active = true`; for `public_view_share_read` the app will filter by token in the query.

---

## Step 4 — Create Supabase Storage bucket

1. In Supabase Dashboard: **Storage** → **New bucket**.
2. Name: **lunex-files**.
3. Set to **Private**.
4. Create the bucket.

**Note:** Do not add storage policies yet. Create the bucket as private only. Storage policies (e.g. authenticated upload to paths starting with `user_id`, public read for files referenced by active shares/requests) will be refined after basic auth and data flow work. This avoids mistakes while connecting the backend.

---

## Step 5 — Replace AuthContext with Supabase Auth

**File:** `src/context/AuthContext.tsx`

- Replace the entire file with a Supabase Auth implementation.
- **Keep the same public interface:** `user` (with `email` and `name`), `isLoggedIn`, `onboardingComplete`, `login`, `signup`, `logout`, `completeOnboarding`.
- **Implementation:**
  - `login`: `supabase.auth.signInWithPassword`.
  - `signup`: `supabase.auth.signUp`.
  - `logout`: `supabase.auth.signOut`.
  - Session: `supabase.auth.getSession` and `supabase.auth.onAuthStateChange`.
- **onboardingComplete:** Read from `profiles.onboarding_complete` in Supabase. When `completeOnboarding()` is called, update `profiles` set `onboarding_complete = true` for the current user.
- **user name:** Read from `profiles.business_name`. Fallback to email if no profile.
- Remove all localStorage usage for auth. Remove `lunex-demo-auth` entirely.
- Keep the same exports so no other file changes imports.

---

## Step 6 — Replace SettingsContext with Supabase profile table

**File:** `src/context/SettingsContext.tsx`

- Replace only the persistence layer. Keep the same **Profile** type and context interface. No changes in the rest of the app.
- **Load:** Fetch profile from Supabase `profiles` where `id = current user id`. Map columns to Profile: `account_type` → `accountType`, `business_name` → `businessNameOrUserName`, `role` → `role`, `role_other` → `roleOther`, `industry` → `industry`, `reference_format_example` → `referenceFormatExample`, `project_number_format_example` → `projectNumberFormatExample`.
- **updateProfile:** Upsert `profiles` with values mapped back to column names.
- Remove all localStorage. Remove `lunex-demo-settings` entirely.
- Keep the same exports.

---

## Step 7 — Replace DataContext with Supabase

**File:** `src/context/DataContext.tsx`

- Replace the entire data layer with Supabase. **Keep the exact same interface.** All function names and signatures stay the same: `addFile`, `updateFile`, `deleteFile`, `addProject`, `updateProject`, `deleteProject`, `addField`, `updateField`, `deleteField`, `addFolder`, `deleteFolder`, `addFileToFolder`, `updateFileInFolder`, `deleteFileFromFolder`, `setNoteEntries`, `addNoteEntry`, `updateNoteEntry`, `deleteNoteEntry`, `addTemplate`, `updateTemplate`, `deleteTemplate`, `nextProjectId`, `recordActivity`. Calling code does not change.

**Function → Supabase mapping:**

| Function | Supabase equivalent |
|---------|---------------------|
| addFile | Insert `client_files`. Set `user_id` = auth user. Return new row (use Supabase-generated id in app). |
| updateFile | Update `client_files` by id. Only update columns present in updates. |
| deleteFile | Delete `client_files` by id. Cascades remove projects, fields, folders, folder_files, note_entries. |
| addProject | Insert `projects`. Set `client_file_id`, `user_id`. |
| updateProject | Update `projects` by id. |
| deleteProject | Delete `projects` by id. Cascades handle children. |
| addField | Insert `fields`. |
| updateField | Update `fields` by id. |
| deleteField | Delete `fields` by id. |
| addFolder | Insert `folders`. |
| deleteFolder | Delete `folders` by id. Cascades handle folder_files. |
| addFileToFolder | Insert `folder_files`. If payload has raw File, upload to Storage first at `user_id/folder_id/filename`, set `storage_path` and `url` on the row. |
| updateFileInFolder | Update `folder_files` by id. |
| deleteFileFromFolder | Delete `folder_files` by id. If row has `storage_path`, delete object from Storage. |
| setNoteEntries | Delete all `note_entries` for the project, then insert the new array. |
| addNoteEntry | Insert `note_entries`. |
| updateNoteEntry | Update `note_entries` by id. |
| deleteNoteEntry | Delete `note_entries` by id. |
| addTemplate | Insert `templates`. Then insert `template_fields` and `template_folders` for each field/folder def. |
| updateTemplate | Update `templates` by id. Delete and re-insert `template_fields` and `template_folders`. |
| deleteTemplate | Delete `templates` by id. Cascades handle template_fields, template_folders. |
| nextProjectId | Query count of projects for current user; return `PRJ-` + zero-padded (count + 1). |
| recordActivity | Insert `activities`. |

**State loading:** Use React Query or `useEffect` + Supabase select to load `files`, `templates`, `activities` when the provider mounts. Subscribe to realtime with `supabase.channel` / `supabase.on` so UI updates when data changes.

Remove all localStorage. Remove `lunex-data` from this file.

---

## Step 8 — Replace share link storage with Supabase

- **ShareModal.tsx:** When generating a share link, insert into `shares`: `token`, `code`, `client_file_id`, `project_ids`, `folder_ids`, `user_id`, `is_active = true`. Remove `lunex-shares` localStorage write.
- **ClientPortal.tsx:** Replace localStorage read with Supabase: select from `shares` where `token = URL token` and `is_active = true`; get `code`, `project_ids`, `folder_ids`. Also fetch the `client_file` and its projects, fields, folders, folder_files for display. Remove `lunex-shares` read.

---

## Step 9 — Replace upload request storage with Supabase

- **RequestFilesModal.tsx:** Replace localStorage write with Supabase insert into `upload_requests`.
- **UploadRequestPage.tsx:** Replace `lunex-requests` read with Supabase select `upload_requests` where `token = URL token` and `is_active = true`. Replace `lunex-data` read/write with Supabase: to add uploaded files, insert into `folder_files` and upload files to Storage.
- **ProjectPage.tsx:** Replace `lunex-requests` read/write with Supabase queries on `upload_requests`.

---

## Step 10 — Replace view share storage with Supabase

- **src/lib/viewShare.ts:** `createViewShare` → Supabase insert into `view_shares`. `getViewShare` → Supabase select by token. Remove `lunex-view-shares` localStorage entirely.

---

## Step 11 — Update LoginPage and SignupPage

- **LoginPage.tsx:** Form submit calls `useAuth().login` (already uses Supabase internally). No UI changes.
- **SignupPage.tsx:** Form submit calls `useAuth().signup`. After signup, create an empty profile row in `profiles`. No UI changes.

---

## Step 12 — Keep sidebar localStorage

- **AppLayout.tsx:** The `lunex-sidebar` key is UI-only (sidebar collapse). Leave it in localStorage. Do not move to Supabase.

---

## Step 13 — Add loading states

- When fetching from Supabase, show a loading spinner or skeleton instead of an empty screen.
- Add a `loading` boolean to DataContext. When `loading === true`, show a centered spinner on Dashboard and Files page. When `loading === false`, show normal content. This avoids a flash of empty state while data loads.

---

## Step 14 — Error handling for Supabase operations

- Wrap every Supabase call in try/catch.
- On error, show a toast with a short, plain-English message. Do not show raw Supabase error codes.
- Map:
  - Auth invalid credentials → "Incorrect email or password. Please try again."
  - Network errors → "Connection problem. Please check your internet and try again."
  - Permission errors → "You do not have permission to do that."
  - All other errors → "Something went wrong. Please try again."

---

## Step 15 — Output a complete checklist

After all code changes:

1. **Checklist:** List every change with file name and what changed.
2. **Remaining localStorage:** List any keys still used and why they were kept.
3. **Manual follow-up:** List any functions or features that could not be fully migrated and need manual attention.

---

## Test flow (after all steps)

1. Sign up as a new user.
2. Complete onboarding.
3. Create a file.
4. Add a project.
5. Add fields.
6. Upload an image to a folder.
7. Refresh the page and confirm the image (and data) persist.
8. Share the file.
9. Open the client portal with the share link and code; confirm read-only view and correct files.
10. Use an upload request link; upload files; confirm they appear in the correct folder.

All of this must work with Supabase as the backend.
