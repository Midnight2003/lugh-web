-- supabase-reset-schema.sql
-- WARNING: This script drops tables and resets your app schema. Only run if you want to delete all current app data.

-- Optional: enable gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop all app tables
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

-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_uq ON public.tags (user_id, name);

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

-- Prompt for rebuilding schema
--
-- Use this prompt when recreating the database schema for this app:
--
-- "Delete the current app tables and recreate the database schema for the student-folder system.
-- The app needs:
-- - nodes with id, name, type, parent_id, user_id
-- - files metadata keyed by node_id, with student_id, name, storage_path, mime_type, size, uploaded_at
-- - tags with user_id and name
-- - file_tags join table between files and tags
-- - compiled_folders with folder_id, selected_file_ids, and auto_select
-- Also ensure the storage bucket is student-files and add proper storage RLS for storage.objects."
