-- Allow authenticated users to upload files to their own folder
-- Path format is: user_id/folder_id/filename
CREATE POLICY "authenticated_users_can_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lunex-files'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "authenticated_users_can_read_own_files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lunex-files'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "authenticated_users_can_delete_own_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lunex-files'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "authenticated_users_can_update_own_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lunex-files'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow public read access to files referenced in active shares
-- This allows clients viewing a shared portal to see images and download files
CREATE POLICY "public_can_read_shared_files"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'lunex-files'
  AND EXISTS (
    SELECT 1 FROM public.shares s
    WHERE s.is_active = true
    AND s.client_file_id IN (
      SELECT cf.id FROM public.client_files cf
      WHERE cf.user_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
);

-- Allow public read access to files in active upload requests
-- This allows upload request page to work without authentication
CREATE POLICY "public_can_read_upload_request_files"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'lunex-files'
  AND EXISTS (
    SELECT 1 FROM public.upload_requests ur
    WHERE ur.is_active = true
    AND ur.folder_id::text = (string_to_array(storage.objects.name, '/'))[2]
  )
);

-- Allow anonymous users to upload files via active upload requests
-- This allows clients to upload to a folder without being logged in
CREATE POLICY "public_can_upload_via_request"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'lunex-files'
  AND EXISTS (
    SELECT 1 FROM public.upload_requests ur
    WHERE ur.is_active = true
    AND ur.folder_id::text = (string_to_array(name, '/'))[2]
  )
);
