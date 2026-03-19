
-- Add grade column to curriculum_designs for grade-specific matching
ALTER TABLE public.curriculum_designs ADD COLUMN IF NOT EXISTS grade text;

-- Backfill subject_id from subjects table matching by code or name
UPDATE public.curriculum_designs cd
SET subject_id = s.id
FROM public.subjects s
WHERE cd.subject_id IS NULL
  AND (s.code = cd.subject_name OR s.name = cd.subject_name);

-- Backfill grade from level for existing data that doesn't have grade set
-- (will be properly set on future uploads via the edge function)
