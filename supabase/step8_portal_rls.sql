-- Step 8: RLS so portal (including anon) can read shared file data
-- Run in Supabase SQL Editor after Step 3. Required for ClientPortal to work for share recipients.

-- Allow anyone to read a client_file that has an active share (portal needs to show it)
CREATE POLICY "client_files_select_via_share" ON client_files FOR SELECT
  USING (EXISTS (SELECT 1 FROM shares s WHERE s.client_file_id = client_files.id AND s.is_active));

-- Allow anyone to read projects that belong to a shared file
CREATE POLICY "projects_select_via_share" ON projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM shares s WHERE s.client_file_id = projects.client_file_id AND s.is_active));

-- Allow anyone to read fields that belong to a project of a shared file
CREATE POLICY "fields_select_via_share" ON fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p
    JOIN shares s ON s.client_file_id = p.client_file_id AND s.is_active
    WHERE p.id = fields.project_id
  ));

-- Allow anyone to read folders that belong to a project of a shared file
CREATE POLICY "folders_select_via_share" ON folders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p
    JOIN shares s ON s.client_file_id = p.client_file_id AND s.is_active
    WHERE p.id = folders.project_id
  ));

-- folder_files already has folder_files_select_public (active share or upload request)
-- No change needed for folder_files.

-- Allow anyone to read note_entries that belong to a project of a shared file
CREATE POLICY "note_entries_select_via_share" ON note_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects p
    JOIN shares s ON s.client_file_id = p.client_file_id AND s.is_active
    WHERE p.id = note_entries.project_id
  ));
