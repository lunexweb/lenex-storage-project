-- Step 2: Create all Supabase tables (run in Supabase SQL Editor)
-- Copy this entire file and paste into: Dashboard → SQL Editor → New query → Run

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
