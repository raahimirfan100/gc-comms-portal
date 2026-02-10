-- Clear all data from all public tables EXCEPT auth.users
-- Run this in the Supabase SQL Editor
-- Tables are truncated in dependency order (children first) to avoid FK violations

BEGIN;

-- Child tables (no dependents)
TRUNCATE TABLE public.communication_log CASCADE;
TRUNCATE TABLE public.reminder_schedules CASCADE;
TRUNCATE TABLE public.assignments CASCADE;
TRUNCATE TABLE public.volunteer_availability CASCADE;
TRUNCATE TABLE public.drive_duties CASCADE;
TRUNCATE TABLE public.duty_capacity_rules CASCADE;
TRUNCATE TABLE public.google_sheets_sync CASCADE;
TRUNCATE TABLE public.whatsapp_sessions CASCADE;

-- Parent tables
TRUNCATE TABLE public.drives CASCADE;
TRUNCATE TABLE public.volunteers CASCADE;
TRUNCATE TABLE public.seasons CASCADE;
TRUNCATE TABLE public.duties CASCADE;
TRUNCATE TABLE public.app_config CASCADE;

COMMIT;
