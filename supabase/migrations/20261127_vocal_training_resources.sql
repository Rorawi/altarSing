-- Shared vocal-training links and a simple choir-use counter.
-- Safe to run more than once; this only adds the new resource table/function.

CREATE TABLE IF NOT EXISTS public.vocal_training_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  times_used INTEGER NOT NULL DEFAULT 0 CHECK (times_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vocal_training_resources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vocal_training_resources'
      AND policyname = 'Allow all on vocal_training_resources'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all on vocal_training_resources"
      ON public.vocal_training_resources FOR ALL
      USING (true) WITH CHECK (true)';
  END IF;
END;
$$;

-- Increment atomically so repeated/concurrent taps do not overwrite the count.
CREATE OR REPLACE FUNCTION public.increment_vocal_training_resource_use(target_resource_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.vocal_training_resources
  SET times_used = times_used + 1,
      updated_at = NOW()
  WHERE id = target_resource_id
  RETURNING times_used;
$$;

GRANT EXECUTE ON FUNCTION public.increment_vocal_training_resource_use(UUID) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
