-- Remove base64 urls from existing records
-- These cannot be displayed anyway and are causing size issues
-- After running this, users will need to re-upload files that show as broken
UPDATE folder_files
SET url = NULL
WHERE url LIKE 'data:%';

-- Show how many were fixed
SELECT COUNT(*) as fixed_records
FROM folder_files
WHERE url IS NULL AND storage_path IS NOT NULL;
