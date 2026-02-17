-- Allow multiple volunteers per phone number (e.g., one person registering family members)
DROP INDEX IF EXISTS public.volunteers_phone_unique;
