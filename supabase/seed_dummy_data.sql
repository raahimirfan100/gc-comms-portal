-- Dummy data for testing: Ramadan season, drives, 10 volunteers, and auto-assignments.
-- Run AFTER full_schema.sql and reseed_defaults.sql (or after DB is populated with defaults).
-- Does not modify duties, duty_capacity_rules, or app_config.

BEGIN;

-- 1) Current Ramadan season (insert only if none exists)
INSERT INTO public.seasons (name, start_date, end_date, hijri_year, is_active)
SELECT 'Ramadan 2026', '2026-02-28'::date, '2026-03-29'::date, 1447, true
WHERE NOT EXISTS (SELECT 1 FROM public.seasons WHERE name = 'Ramadan 2026' LIMIT 1);

-- Use the active season (idempotent: reuse if already exists)
DO $$
DECLARE
  v_season_id uuid;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons WHERE name = 'Ramadan 2026' ORDER BY start_date DESC LIMIT 1;
  IF v_season_id IS NULL THEN
    SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;
  END IF;
  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'No season found. Run season insert first.';
  END IF;

  -- 2) Current drives (one completed, one in_progress, one open/scheduled); skip if already present
  --    Include location and Google Maps pin for map display
  INSERT INTO public.drives (
    season_id, name, drive_date, daig_count, status, volunteer_target,
    location_name, location_address, location_lat, location_lng
  )
  SELECT v_season_id, t.name, t.drive_date, 1, t.status, 16,
    t.location_name, t.location_address, t.location_lat, t.location_lng
  FROM (VALUES
    (
      'Iftaar Drive #1 – Test Completed'::text,
      '2026-02-28'::date,
      'completed'::public.drive_status,
      'Askari Community Centre'::text,
      '123 Test Street, Sydney NSW 2000, Australia'::text,
      -33.8688::double precision,
      151.2093::double precision
    ),
    (
      'Iftaar Drive #2 – Test In Progress',
      '2026-03-01'::date,
      'in_progress'::public.drive_status,
      'Askari Community Centre',
      '123 Test Street, Sydney NSW 2000, Australia',
      -33.8688::double precision,
      151.2093::double precision
    ),
    (
      'Iftaar Drive #3 – Test Open',
      '2026-03-02'::date,
      'open'::public.drive_status,
      'Askari Community Centre',
      '123 Test Street, Sydney NSW 2000, Australia',
      -33.8688::double precision,
      151.2093::double precision
    )
  ) AS t(name, drive_date, status, location_name, location_address, location_lat, location_lng)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.drives d WHERE d.season_id = v_season_id AND d.name = t.name
  );

  -- Backfill location for existing test drives that were created without it
  UPDATE public.drives
  SET
    location_name = 'Askari Community Centre',
    location_address = '123 Test Street, Sydney NSW 2000, Australia',
    location_lat = -33.8688,
    location_lng = 151.2093
  WHERE name LIKE 'Iftaar Drive #% – Test %'
    AND location_lat IS NULL;

  -- 2b) Drive duties for all drives in this season (capacity 4 per duty so assignments fit)
  INSERT INTO public.drive_duties (drive_id, duty_id, capacity_mode, calculated_capacity)
  SELECT d.id, dt.id, 'linear'::public.capacity_mode, 4
  FROM public.drives d
  JOIN public.duties dt ON dt.is_active = true
  WHERE d.season_id = v_season_id
    AND d.name LIKE 'Iftaar Drive #% – Test %'
  ON CONFLICT (drive_id, duty_id) DO NOTHING;
END $$;

-- 3) 10 dummy volunteers (mix male/female for duty restrictions: Traffic, Daig = male)
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
  ('Dummy Volunteer 10', '+61400000010', 'dummy10@test.local', 'female'::public.gender, 'manual'::public.volunteer_source)
ON CONFLICT (phone) DO NOTHING;

-- 4) Auto-assign each dummy volunteer to a random (drive, duty) on open / in_progress / completed drives
--    Respects duty gender_restriction (Traffic, Daig = male only).
INSERT INTO public.assignments (volunteer_id, drive_id, duty_id, status, assigned_by, is_manual_override)
SELECT v.id, slot.drive_id, slot.duty_id, 'assigned'::public.assignment_status, 'dummy_script', false
FROM (
  SELECT id, gender
  FROM public.volunteers
  WHERE name LIKE 'Dummy Volunteer %'
  ORDER BY phone
  LIMIT 10
) v
CROSS JOIN LATERAL (
  SELECT dd.drive_id, dd.duty_id
  FROM public.drive_duties dd
  JOIN public.drives d ON d.id = dd.drive_id
  JOIN public.duties dt ON dt.id = dd.duty_id
  WHERE d.status IN ('open', 'in_progress', 'completed')
    AND d.name LIKE 'Iftaar Drive #% – Test %'
    AND (dt.gender_restriction IS NULL OR dt.gender_restriction = v.gender)
  ORDER BY random()
  LIMIT 1
) slot;

-- (Optional) Sign-ups: add volunteer_availability for each assignment so drives show as “signed up”
INSERT INTO public.volunteer_availability (volunteer_id, drive_id, source)
SELECT a.volunteer_id, a.drive_id, 'manual'::public.volunteer_source
FROM public.assignments a
JOIN public.volunteers v ON v.id = a.volunteer_id
WHERE v.name LIKE 'Dummy Volunteer %'
  AND a.assigned_by = 'dummy_script'
ON CONFLICT (volunteer_id, drive_id) DO NOTHING;

COMMIT;
