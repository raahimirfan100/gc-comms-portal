-- Single script: clear all data, reseed defaults, then seed dummy data for testing.
-- Run in Supabase SQL Editor. Requires full_schema.sql to have been applied.
-- Order: 1) TRUNCATE all public data  2) Default duties, capacity rules, app_config  3) Ramadan season, 10 test drives (Askari 3 Karachi), 10 volunteers, assignments.

BEGIN;

-- =============================================================================
-- PART 1: Clear all data (child tables first to avoid FK violations)
-- =============================================================================
TRUNCATE TABLE public.communication_log CASCADE;
TRUNCATE TABLE public.reminder_schedules CASCADE;
TRUNCATE TABLE public.assignments CASCADE;
TRUNCATE TABLE public.volunteer_availability CASCADE;
TRUNCATE TABLE public.drive_duties CASCADE;
TRUNCATE TABLE public.duty_capacity_rules CASCADE;
TRUNCATE TABLE public.google_sheets_sync CASCADE;
TRUNCATE TABLE public.whatsapp_sessions CASCADE;
TRUNCATE TABLE public.drives CASCADE;
TRUNCATE TABLE public.volunteers CASCADE;
TRUNCATE TABLE public.seasons CASCADE;
TRUNCATE TABLE public.duties CASCADE;
TRUNCATE TABLE public.app_config CASCADE;

-- =============================================================================
-- PART 2: Reseed defaults (duties, capacity rules, app_config)
-- =============================================================================
INSERT INTO public.duties (name, slug, display_order, gender_restriction, is_active) VALUES
  ('Provider', 'provider', 1, null, true),
  ('Dari', 'dari', 2, null, true),
  ('Thaal', 'thaal', 3, null, true),
  ('Traffic', 'traffic', 4, 'male'::public.gender, true),
  ('Sherbet', 'sherbet', 5, null, true),
  ('Daig', 'daig', 6, 'male'::public.gender, true)
ON CONFLICT (slug) DO UPDATE SET
  name = excluded.name,
  display_order = excluded.display_order,
  gender_restriction = excluded.gender_restriction,
  is_active = excluded.is_active;

INSERT INTO public.duty_capacity_rules (duty_id, capacity_mode, base_count, per_daig_count)
SELECT id, 'linear'::public.capacity_mode, 2, 1.5 FROM public.duties WHERE slug = 'provider'
UNION ALL SELECT id, 'linear'::public.capacity_mode, 2, 1.0 FROM public.duties WHERE slug = 'dari'
UNION ALL SELECT id, 'linear'::public.capacity_mode, 2, 1.0 FROM public.duties WHERE slug = 'thaal'
UNION ALL SELECT id, 'linear'::public.capacity_mode, 1, 0.5 FROM public.duties WHERE slug = 'traffic'
UNION ALL SELECT id, 'linear'::public.capacity_mode, 1, 0.5 FROM public.duties WHERE slug = 'sherbet'
UNION ALL SELECT id, 'linear'::public.capacity_mode, 1, 0.5 FROM public.duties WHERE slug = 'daig';

INSERT INTO public.duty_capacity_rules (duty_id, capacity_mode, tier_min_daigs, tier_max_daigs, tier_capacity)
SELECT id, 'tiered'::public.capacity_mode, 1, 5, 4 FROM public.duties WHERE slug = 'traffic'
UNION ALL SELECT id, 'tiered'::public.capacity_mode, 6, 10, 8 FROM public.duties WHERE slug = 'traffic'
UNION ALL SELECT id, 'tiered'::public.capacity_mode, 11, null, 12 FROM public.duties WHERE slug = 'traffic';

INSERT INTO public.app_config (key, value, description) VALUES
  ('assignment_rules', '{"history_lookback": "current_season", "waitlist_auto_fill": true, "male_priority_order": ["provider", "dari", "traffic", "daig", "thaal", "sherbet"], "female_priority_order": ["thaal", "female-provider", "female-dari", "provider", "dari", "sherbet"]}'::jsonb, 'Auto-assignment algorithm configuration'),
  ('ai_calling', '{"enabled": false, "provider": "retell", "retell_api_key": "", "retell_agent_id": "", "retell_from_number": "", "stagger_delay_ms": 2000, "auto_call_hours_before_sunset": 2}'::jsonb, 'Retell AI phone calling configuration'),
  ('whatsapp', '{"enabled": false, "confirm_keywords": ["confirm", "yes", "haan", "ji", "ha", "han"], "cancel_keywords": ["cancel", "no", "nahi", "nhi"], "rate_limit_per_second": 1, "rate_limit_burst": 5}'::jsonb, 'WhatsApp messaging configuration'),
  ('reminder_defaults', '{"reminders": [{"type": "first_reminder", "hours_before_sunset": 6, "template": "Assalam o Alaikum {name}! Reminder: You are assigned to {duty} for {drive_name} today at {location}. Sunset is at {sunset_time}. Please confirm by replying YES."}, {"type": "second_reminder", "hours_before_sunset": 3, "template": "Reminder: {name}, please confirm your attendance for {duty} at {drive_name}. Sunset at {sunset_time}."}, {"type": "final_reminder", "hours_before_sunset": 1.5, "template": "{name}, iftaar in 1.5 hours! Please head to {location} for your {duty} duty. JazakAllah Khair!"}]}'::jsonb, 'Default reminder templates for new drives'),
  ('alerts', '{"notify_admins": true, "deficit_threshold_percent": 20}'::jsonb, 'Alert and notification thresholds'),
  ('signup_form_window', '{"mode": "next_n_days", "days": 7}'::jsonb, 'Volunteer sign-up form: which drives to show (next_n_days, next_m_drives, or manual date range)')
ON CONFLICT (key) DO UPDATE SET value = excluded.value, description = excluded.description;

-- =============================================================================
-- PART 3: Dummy data (Ramadan season, 10 drives at Askari 3 Karachi, 10 volunteers, assignments)
-- =============================================================================
INSERT INTO public.seasons (name, start_date, end_date, hijri_year, is_active)
VALUES ('Ramadan 2026', '2026-02-28'::date, '2026-03-29'::date, 1447, true);

DO $$
DECLARE
  v_season_id uuid;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons WHERE name = 'Ramadan 2026' LIMIT 1;

  INSERT INTO public.drives (
    season_id, name, drive_date, daig_count, status, volunteer_target,
    location_name, location_address, location_lat, location_lng
  )
  SELECT v_season_id, t.name, t.drive_date, 1, t.status, 16,
    'Askari 3'::text, 'Askari 3, Karachi'::text, 24.8934::double precision, 67.0880::double precision
  FROM (VALUES
    ('Iftaar Drive #1 – Test'::text, '2026-02-28'::date, 'completed'::public.drive_status),
    ('Iftaar Drive #2 – Test', '2026-03-01'::date, 'in_progress'::public.drive_status),
    ('Iftaar Drive #3 – Test', '2026-03-02'::date, 'open'::public.drive_status),
    ('Iftaar Drive #4 – Test', '2026-03-03'::date, 'open'::public.drive_status),
    ('Iftaar Drive #5 – Test', '2026-03-04'::date, 'open'::public.drive_status),
    ('Iftaar Drive #6 – Test', '2026-03-05'::date, 'draft'::public.drive_status),
    ('Iftaar Drive #7 – Test', '2026-03-06'::date, 'draft'::public.drive_status),
    ('Iftaar Drive #8 – Test', '2026-03-07'::date, 'draft'::public.drive_status),
    ('Iftaar Drive #9 – Test', '2026-03-08'::date, 'draft'::public.drive_status),
    ('Iftaar Drive #10 – Test', '2026-03-09'::date, 'draft'::public.drive_status)
  ) AS t(name, drive_date, status);

  INSERT INTO public.drive_duties (drive_id, duty_id, capacity_mode, calculated_capacity)
  SELECT d.id, dt.id, 'linear'::public.capacity_mode, public.calculate_duty_capacity(d.daig_count, dt.id, 'linear')
  FROM public.drives d
  JOIN public.duties dt ON dt.is_active = true
  WHERE d.season_id = v_season_id AND d.name LIKE 'Iftaar Drive #% – Test';
END $$;

INSERT INTO public.volunteers (name, phone, email, gender, source)
VALUES
  ('Dummy Volunteer 1', '+61400000001', 'dummy1@test.local', 'male'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 2', '+61400000002', 'dummy2@test.local', 'male'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 3', '+61400000003', 'dummy3@test.local', 'female'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 4', '+61400000004', 'dummy4@test.local', 'male'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 5', '+61400000005', 'dummy5@test.local', 'female'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 6', '+61400000006', 'dummy6@test.local', 'male'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 7', '+61400000007', 'dummy7@test.local', 'female'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 8', '+61400000008', 'dummy8@test.local', 'male'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 9', '+61400000009', 'dummy9@test.local', 'male'::public.gender, 'manual'::public.volunteer_source),
  ('Dummy Volunteer 10', '+61400000010', 'dummy10@test.local', 'female'::public.gender, 'manual'::public.volunteer_source);

INSERT INTO public.assignments (volunteer_id, drive_id, duty_id, status, assigned_by, is_manual_override)
SELECT v.id, slot.drive_id, slot.duty_id, 'assigned'::public.assignment_status, 'dummy_script', false
FROM (
  SELECT id, gender FROM public.volunteers WHERE name LIKE 'Dummy Volunteer %' ORDER BY phone LIMIT 10
) v
CROSS JOIN LATERAL (
  SELECT dd.drive_id, dd.duty_id
  FROM public.drive_duties dd
  JOIN public.drives d ON d.id = dd.drive_id
  JOIN public.duties dt ON dt.id = dd.duty_id
  WHERE d.status IN ('open', 'in_progress', 'completed')
    AND d.name LIKE 'Iftaar Drive #% – Test'
    AND (dt.gender_restriction IS NULL OR dt.gender_restriction = v.gender)
  ORDER BY random()
  LIMIT 1
) slot;

INSERT INTO public.volunteer_availability (volunteer_id, drive_id, source)
SELECT a.volunteer_id, a.drive_id, 'manual'::public.volunteer_source
FROM public.assignments a
JOIN public.volunteers v ON v.id = a.volunteer_id
WHERE v.name LIKE 'Dummy Volunteer %' AND a.assigned_by = 'dummy_script'
ON CONFLICT (volunteer_id, drive_id) DO NOTHING;

COMMIT;
