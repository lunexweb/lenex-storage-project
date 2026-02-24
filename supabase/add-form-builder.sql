-- Add rich field type support to template_fields
ALTER TABLE template_fields
ADD COLUMN IF NOT EXISTS field_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS placeholder text,
ADD COLUMN IF NOT EXISTS required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS options jsonb,
ADD COLUMN IF NOT EXISTS terms_text text;

-- Add form sharing support to templates
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_shareable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
ADD COLUMN IF NOT EXISTS share_code text;

-- Create form_submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  submitter_name text,
  submitter_email text,
  submitted_at timestamptz DEFAULT now(),
  field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'imported', 'rejected')),
  client_file_id uuid REFERENCES client_files(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL
);

-- RLS for form_submissions
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Template owner can read all submissions for their templates
CREATE POLICY "owner_read_submissions" ON form_submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = form_submissions.template_id
    AND t.user_id = auth.uid()
  )
);

-- Anyone can insert a submission if the template is shareable
CREATE POLICY "public_submit_form" ON form_submissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = form_submissions.template_id
    AND t.is_shareable = true
  )
);

-- Template owner can update submissions
CREATE POLICY "owner_update_submissions" ON form_submissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = form_submissions.template_id
    AND t.user_id = auth.uid()
  )
);

-- Allow public read of shareable templates by token
CREATE POLICY "public_read_shareable_templates" ON templates
FOR SELECT USING (
  user_id = auth.uid() OR is_shareable = true
);

-- Allow public read of fields for shareable templates
CREATE POLICY "public_read_shareable_template_fields" ON template_fields
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = template_fields.template_id
    AND (t.user_id = auth.uid() OR t.is_shareable = true)
  )
);
