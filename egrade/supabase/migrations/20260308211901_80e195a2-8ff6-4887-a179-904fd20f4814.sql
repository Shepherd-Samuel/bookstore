
-- Backfill subject_id for curriculum entries where subject_name matches a subject code
UPDATE public.curriculum_designs cd
SET subject_id = s.id
FROM public.subjects s
WHERE cd.subject_id IS NULL
  AND s.code = cd.subject_name;
