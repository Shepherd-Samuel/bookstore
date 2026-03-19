-- Clean up test parent data
DELETE FROM public.user_roles WHERE user_id = '3a213ca6-c948-4204-a491-4bfa228a1897';
DELETE FROM public.profiles WHERE id = '3a213ca6-c948-4204-a491-4bfa228a1897';
DELETE FROM public.parents WHERE id = '74ea6759-30b5-404f-8f86-23157ce0abfd';
