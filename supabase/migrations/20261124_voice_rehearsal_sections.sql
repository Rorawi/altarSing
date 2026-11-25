-- Optional named arrangement sections within a voice rehearsal project.
-- Run this migration in the Supabase SQL editor before deploying the section UI.

CREATE TABLE IF NOT EXISTS public.rehearsal_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.rehearsal_projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  position    INTEGER NOT NULL CHECK (position >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rehearsal_sections_project_position
  ON public.rehearsal_sections(project_id, position);

-- Give every existing and new project its original, familiar section.
INSERT INTO public.rehearsal_sections (project_id, name, position)
SELECT project.id, 'Recorded parts', 0
FROM public.rehearsal_projects AS project
WHERE NOT EXISTS (
  SELECT 1
  FROM public.rehearsal_sections AS section
  WHERE section.project_id = project.id
    AND section.position = 0
)
ON CONFLICT (project_id, position) DO NOTHING;

ALTER TABLE public.rehearsal_takes
  ADD COLUMN IF NOT EXISTS section_id UUID;

ALTER TABLE public.rehearsal_takes
  ADD COLUMN IF NOT EXISTS line_label TEXT;

UPDATE public.rehearsal_takes AS take
SET section_id = section.id
FROM public.rehearsal_sections AS section
WHERE take.section_id IS NULL
  AND section.project_id = take.project_id
  AND section.position = 0;

UPDATE public.rehearsal_takes
SET line_label = part_label
WHERE line_label IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'rehearsal_takes_section_id_fkey'
      AND conrelid = 'public.rehearsal_takes'::regclass
  ) THEN
    ALTER TABLE public.rehearsal_takes
      ADD CONSTRAINT rehearsal_takes_section_id_fkey
      FOREIGN KEY (section_id) REFERENCES public.rehearsal_sections(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.rehearsal_takes
  ALTER COLUMN section_id SET NOT NULL;

ALTER TABLE public.rehearsal_takes
  ALTER COLUMN line_label SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'rehearsal_takes_line_label_check'
      AND conrelid = 'public.rehearsal_takes'::regclass
  ) THEN
    ALTER TABLE public.rehearsal_takes
      ADD CONSTRAINT rehearsal_takes_line_label_check
      CHECK (length(btrim(line_label)) BETWEEN 1 AND 40);
  END IF;
END;
$$;

-- The same voice may have a different take in another song section.
DROP INDEX IF EXISTS public.idx_rehearsal_takes_project_part;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rehearsal_takes_section_part
  ON public.rehearsal_takes(section_id, lower(part_label));

-- Cap each section at eight takes, serializing inserts on its section row.
CREATE OR REPLACE FUNCTION public.enforce_rehearsal_project_part_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_part_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.section_id IS DISTINCT FROM OLD.section_id THEN
    PERFORM id
      FROM public.rehearsal_sections
      WHERE id = NEW.section_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Choose a valid song section for this recording.'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT count(*)
      INTO current_part_count
      FROM public.rehearsal_takes
      WHERE section_id = NEW.section_id;

    IF current_part_count >= 8 THEN
      RAISE EXCEPTION 'A song section can have at most 8 recorded parts.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_rehearsal_project_part_limit ON public.rehearsal_takes;
CREATE TRIGGER enforce_rehearsal_project_part_limit
  BEFORE INSERT OR UPDATE OF section_id ON public.rehearsal_takes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rehearsal_project_part_limit();

CREATE OR REPLACE FUNCTION public.create_default_rehearsal_section()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.rehearsal_sections (project_id, name, position)
  VALUES (NEW.id, 'Recorded parts', 0)
  ON CONFLICT (project_id, position) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_default_rehearsal_section ON public.rehearsal_projects;
CREATE TRIGGER create_default_rehearsal_section
  AFTER INSERT ON public.rehearsal_projects
  FOR EACH ROW EXECUTE FUNCTION public.create_default_rehearsal_section();

ALTER TABLE public.rehearsal_sections ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.rehearsal_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rehearsal_sections TO authenticated;
GRANT ALL ON public.rehearsal_sections TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_sections' AND policyname = 'Anyone can view rehearsal sections') THEN
    CREATE POLICY "Anyone can view rehearsal sections"
      ON public.rehearsal_sections FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_sections' AND policyname = 'Owners can create rehearsal sections') THEN
    CREATE POLICY "Owners can create rehearsal sections"
      ON public.rehearsal_sections FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects AS project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_sections' AND policyname = 'Owners can update rehearsal sections') THEN
    CREATE POLICY "Owners can update rehearsal sections"
      ON public.rehearsal_sections FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects AS project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects AS project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'rehearsal_sections' AND policyname = 'Owners can delete rehearsal sections') THEN
    CREATE POLICY "Owners can delete rehearsal sections"
      ON public.rehearsal_sections FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.rehearsal_projects AS project
          WHERE project.id = project_id
            AND project.owner_id = (SELECT auth.uid())
        )
      );
  END IF;
END;
$$;
