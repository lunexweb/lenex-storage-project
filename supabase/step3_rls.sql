-- Step 3: Enable Row Level Security and create policies (run in Supabase SQL Editor)
-- Copy this entire file and paste into: Dashboard → SQL Editor → New query → Run

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
  EXISTS (SELECT 1 FROM shares s WHERE s.is_active AND folder_files.folder_id::text = ANY(s.folder_ids))
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
