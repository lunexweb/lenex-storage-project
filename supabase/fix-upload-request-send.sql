-- Fix: Send button on upload request page not working (anon user cannot insert folder_files or upload to storage)
-- Run this in Supabase SQL Editor. Safe to run more than once (drops then recreates policies).

-- 1. Allow anon to insert into folder_files when (folder_id, user_id) matches an active upload request
DROP POLICY IF EXISTS "folder_files_insert_via_request" ON folder_files;
CREATE POLICY "folder_files_insert_via_request" ON folder_files FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM upload_requests ur
    WHERE ur.folder_id = folder_files.folder_id AND ur.is_active AND ur.user_id = folder_files.user_id
  ));

-- 2. Allow anon to upload to storage when path is user_id/folder_id/... and that (user_id, folder_id) has an active upload_request
DROP POLICY IF EXISTS "storage_insert_via_upload_request" ON storage.objects;
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
