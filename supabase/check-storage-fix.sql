-- Verify storage policies exist
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- Check if any existing folder_files have base64 urls stored
-- Base64 urls start with 'data:' and are very long
SELECT 
  id,
  name,
  storage_path,
  CASE 
    WHEN url LIKE 'data:%' THEN 'BASE64 - NEEDS FIX'
    WHEN url LIKE 'https://%' THEN 'SIGNED URL - OK'
    WHEN url IS NULL THEN 'NULL - OK'
    ELSE 'UNKNOWN'
  END as url_status,
  LENGTH(url) as url_length
FROM folder_files
ORDER BY created_at DESC
LIMIT 50;
