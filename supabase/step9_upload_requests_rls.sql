-- Step 9: RLS so upload request page (anon) can read folder name, insert folder_files, and upload to Storage
-- Run in Supabase SQL Editor. Required for UploadRequestPage to work for clients.
-- (Step 3 already allows anon to read upload_requests where is_active = true via public_request_read.)

-- Allow anyone to read a folder that is the target of an active upload request (so we can show folder name)
CREATE POLICY "folders_select_via_upload_request" ON folders FOR SELECT
  USING (EXISTS (SELECT 1 FROM upload_requests ur WHERE ur.folder_id = folders.id AND ur.is_active));

-- Allow anyone to insert into folder_files when (folder_id, user_id) matches an active upload request (client uploads)
CREATE POLICY "folder_files_insert_via_request" ON folder_files FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM upload_requests ur
    WHERE ur.folder_id = folder_files.folder_id AND ur.is_active AND ur.user_id = folder_files.user_id
  ));

-- Storage: allow uploads to lunex-files when path is user_id/folder_id/... and (user_id, folder_id) has an active upload_request
-- (Create bucket "lunex-files" in Dashboard first if needed.)
CREATE POLICY "storage_insert_via_upload_request" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lunex-files'
    AND EXISTS (
      SELECT 1 FROM upload_requests ur
      WHERE ur.is_active
        AND ur.user_id::text = (string_to_array(name, '/'))[1]
        AND ur.folder_id::text = (string_to_array(name, '/'))[2]
    )
  );
