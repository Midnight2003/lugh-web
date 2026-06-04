-- supabase-reset-schema.sql
-- WARNING: This script drops tables and resets your app schema. Only run if you want to delete all current app data.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop app tables in reverse dependency order
DROP TABLE IF EXISTS public.file_tags CASCADE;
DROP TABLE IF EXISTS public.compiled_folders CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.nodes CASCADE;

-- Nodes table
CREATE TABLE public.nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  parent_id uuid NULL,
  user_id uuid NOT NULL,
  profile_photo_path text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nodes_parent_fk FOREIGN KEY (parent_id) REFERENCES public.nodes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS nodes_user_id_idx ON public.nodes (user_id);
CREATE INDEX IF NOT EXISTS nodes_parent_id_idx ON public.nodes (parent_id);

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage own nodes" ON public.nodes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nodes TO authenticated;

-- Files metadata table
CREATE TABLE public.files (
  node_id uuid PRIMARY KEY,
  student_id uuid NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_node_fk FOREIGN KEY (node_id) REFERENCES public.nodes (id) ON DELETE CASCADE,
  CONSTRAINT files_student_fk FOREIGN KEY (student_id) REFERENCES public.nodes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS files_student_id_idx ON public.files (student_id);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage own file metadata" ON public.files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.nodes n
      WHERE n.id = student_id
        AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.nodes n
      WHERE n.id = student_id
        AND n.user_id = auth.uid()
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;

-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_uq ON public.tags (user_id, name);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage own tags" ON public.tags
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;

-- File tags join table
CREATE TABLE public.file_tags (
  file_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  PRIMARY KEY (file_id, tag_id),
  CONSTRAINT file_tags_file_fk FOREIGN KEY (file_id) REFERENCES public.files (node_id) ON DELETE CASCADE,
  CONSTRAINT file_tags_tag_fk FOREIGN KEY (tag_id) REFERENCES public.tags (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS file_tags_file_id_idx ON public.file_tags (file_id);
CREATE INDEX IF NOT EXISTS file_tags_tag_id_idx ON public.file_tags (tag_id);

ALTER TABLE public.file_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage own file_tags" ON public.file_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.files f
      JOIN public.nodes n ON n.id = f.student_id
      WHERE f.node_id = file_id
        AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.files f
      JOIN public.nodes n ON n.id = f.student_id
      WHERE f.node_id = file_id
        AND n.user_id = auth.uid()
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_tags TO authenticated;

-- Compiled folders configuration
CREATE TABLE public.compiled_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL,
  tag_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  selected_file_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  auto_select boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compiled_folders_folder_fk FOREIGN KEY (folder_id) REFERENCES public.nodes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS compiled_folders_folder_id_idx ON public.compiled_folders (folder_id);

ALTER TABLE public.compiled_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage own compiled folders" ON public.compiled_folders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.nodes n
      WHERE n.id = folder_id
        AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.nodes n
      WHERE n.id = folder_id
        AND n.user_id = auth.uid()
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compiled_folders TO authenticated;

-- End of schema reset
