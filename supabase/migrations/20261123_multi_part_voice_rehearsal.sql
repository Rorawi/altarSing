-- Multi-part voice rehearsal recorder
-- Run this script in the Supabase SQL editor. It is safe to run more than once.
--
-- Listener model:
--   * Rehearsal metadata is readable to anon and authenticated roles.
--   * The audio bucket stays private; public playback must go through the app's
--     server endpoint, which returns short-lived signed URLs.
--   * Direct authenticated-user writes are limited to rows/files owned by that
--     user's auth.uid(). The no-Supabase-Auth admin flow uses a server-only
--     service-role client after checking the app's admin passphrase. Never put
--     that service-role key in browser code.

CREATE TABLE IF NOT EXISTS public.rehearsal_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  bpm         INTEGER CHECK (bpm IS NULL OR bpm BETWEEN 20 AND 300),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_rehearsal_projects_expires_at
  ON public.rehearsal_projects(expires_at);

CREATE TABLE IF NOT EXISTS public.rehearsal_takes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.rehearsal_projects(id) ON DELETE CASCADE,
  part_label        TEXT NOT NULL CHECK (length(btrim(part_label)) > 0),
  storage_path      TEXT NOT NULL UNIQUE,
  mime_type         TEXT NOT NULL CHECK (mime_type IN ('audio/webm', 'audio/mp4')),
  duration_seconds  NUMERIC(8, 3) NOT NULL CHECK (duration_seconds > 0 AND duration_seconds <= 600),
  offset_ms         INTEGER NOT NULL DEFAULT 0 CHECK (offset_ms BETWEEN -5000 AND 5000),
  volume            NUMERIC(4, 3) NOT NULL DEFAULT 1 CHECK (volume BETWEEN 0 AND 2),
  is_muted          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- A project has one current take per part. Re-recording replaces that part's
-- object/metadata rather than silently creating a second active track.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rehearsal_takes_project_part
  ON public.rehearsal_takes(project_id, lower(part_label));
CREATE INDEX IF NOT EXISTS idx_rehearsal_takes_expires_at
  ON public.rehearsal_takes(expires_at);

CREATE TABLE IF NOT EXISTS public.rehearsal_take_notes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  take_id            UUID NOT NULL REFERENCES public.rehearsal_takes(id) ON DELETE CASCADE,
  timestamp_seconds  NUMERIC(8, 3) NOT NULL CHECK (timestamp_seconds >= 0),
  body               TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rehearsal_take_notes_take_time
  ON public.rehearsal_take_notes(take_id, timestamp_seconds);

-- Enforce the eight-part cap in the database as well as in the UI. Locking the
-- parent serializes concurrent inserts for the same project.
CREATE OR REPLACE FUNCTION public.enforce_rehearsal_project_part_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_part_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    PERFORM id
      FROM public.rehearsal_projects
      WHERE id = NEW.project_id
      FOR UPDATE;

    SELECT count(*)
      INTO current_part_count
      FROM public.rehearsal_takes
      WHERE project_id = NEW.project_id;

    IF current_part_count >= 8 THEN
      RAISE EXCEPTION 'A rehearsal project can have at most 8 recorded parts.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgname = 'enforce_rehearsal_project_part_limit'
      AND tgrelid = 'public.rehearsal_takes'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER enforce_rehearsal_project_part_limit
      BEFORE INSERT OR UPDATE OF project_id ON public.rehearsal_takes
      FOR EACH ROW EXECUTE FUNCTION public.enforce_rehearsal_project_part_limit();
  END IF;
END;
$$;

ALTER TABLE public.rehearsal_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsal_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehearsal_take_notes ENABLE ROW LEVEL SECURITY;

-- Create policies only when absent; no existing policy is removed or replaced.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_projects' AND policyname = 'Anyone can view rehearsal projects') THEN
    CREATE POLICY "Anyone can view rehearsal projects"
      ON public.rehearsal_projects FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_projects' AND policyname = 'Owners can create rehearsal projects') THEN
    CREATE POLICY "Owners can create rehearsal projects"
      ON public.rehearsal_projects FOR INSERT TO authenticated
      WITH CHECK (owner_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_projects' AND policyname = 'Owners can update rehearsal projects') THEN
    CREATE POLICY "Owners can update rehearsal projects"
      ON public.rehearsal_projects FOR UPDATE TO authenticated
      USING (owner_id = (SELECT auth.uid()))
      WITH CHECK (owner_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_projects' AND policyname = 'Owners can delete rehearsal projects') THEN
    CREATE POLICY "Owners can delete rehearsal projects"
      ON public.rehearsal_projects FOR DELETE TO authenticated
      USING (owner_id = (SELECT auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_takes' AND policyname = 'Anyone can view rehearsal takes') THEN
    CREATE POLICY "Anyone can view rehearsal takes"
      ON public.rehearsal_takes FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_takes' AND policyname = 'Owners can create rehearsal takes') THEN
    CREATE POLICY "Owners can create rehearsal takes"
      ON public.rehearsal_takes FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_takes' AND policyname = 'Owners can update rehearsal takes') THEN
    CREATE POLICY "Owners can update rehearsal takes"
      ON public.rehearsal_takes FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_takes' AND policyname = 'Owners can delete rehearsal takes') THEN
    CREATE POLICY "Owners can delete rehearsal takes"
      ON public.rehearsal_takes FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_take_notes' AND policyname = 'Anyone can view rehearsal take notes') THEN
    CREATE POLICY "Anyone can view rehearsal take notes"
      ON public.rehearsal_take_notes FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_take_notes' AND policyname = 'Owners can create rehearsal take notes') THEN
    CREATE POLICY "Owners can create rehearsal take notes"
      ON public.rehearsal_take_notes FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.rehearsal_takes take
          JOIN public.rehearsal_projects project ON project.id = take.project_id
          WHERE take.id = take_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_take_notes' AND policyname = 'Owners can update rehearsal take notes') THEN
    CREATE POLICY "Owners can update rehearsal take notes"
      ON public.rehearsal_take_notes FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.rehearsal_takes take
          JOIN public.rehearsal_projects project ON project.id = take.project_id
          WHERE take.id = take_id
            AND project.owner_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.rehearsal_takes take
          JOIN public.rehearsal_projects project ON project.id = take.project_id
          WHERE take.id = take_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_take_notes' AND policyname = 'Owners can delete rehearsal take notes') THEN
    CREATE POLICY "Owners can delete rehearsal take notes"
      ON public.rehearsal_take_notes FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.rehearsal_takes take
          JOIN public.rehearsal_projects project ON project.id = take.project_id
          WHERE take.id = take_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;
END;
$$;

-- Private bucket; enforce the hard 50 MB per-object limit in Storage itself.
DO $$
DECLARE
  existing_is_public BOOLEAN;
  existing_size_limit BIGINT;
  existing_mime_types TEXT[];
BEGIN
  SELECT public, file_size_limit, allowed_mime_types
    INTO existing_is_public, existing_size_limit, existing_mime_types
    FROM storage.buckets
    WHERE id = 'rehearsal-audio';

  IF FOUND THEN
    IF existing_is_public IS DISTINCT FROM false
      OR existing_size_limit IS DISTINCT FROM 52428800
      OR existing_mime_types IS DISTINCT FROM ARRAY['audio/webm', 'audio/mp4']::text[]
    THEN
      RAISE EXCEPTION 'The rehearsal-audio bucket already exists with different settings. Review it manually; this migration will not overwrite them.';
    END IF;
  ELSE
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'rehearsal-audio',
      'rehearsal-audio',
      false,
      52428800,
      ARRAY['audio/webm', 'audio/mp4']::text[]
    );
  END IF;
END;
$$;

-- Authenticated direct access is scoped to a folder named after the user's id.
-- The app's passphrase-admin routes use the service-role key server-side and
-- store their objects under admin/<project-id>/...; signed playback is issued
-- by the server, so anon users get no direct storage.objects access.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can read their rehearsal audio') THEN
    CREATE POLICY "Owners can read their rehearsal audio"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'rehearsal-audio'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can upload their rehearsal audio') THEN
    CREATE POLICY "Owners can upload their rehearsal audio"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'rehearsal-audio'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can delete their rehearsal audio') THEN
    CREATE POLICY "Owners can delete their rehearsal audio"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'rehearsal-audio'
        AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
      );
  END IF;
END;
$$;
