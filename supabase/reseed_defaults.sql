-- Reseed default duties, capacity rules, and app_config entries
-- Run this AFTER the schema in full_schema.sql has been applied
-- and typically AFTER running clear_all_data.sql to truncate data.
-- This script is designed to be safe to re-run.

BEGIN;

-- Default duties (upsert by slug so this is idempotent)
insert into public.duties (name, slug, display_order, gender_restriction, is_active) values
  ('Provider', 'provider', 1, null, true),
  ('Dari', 'dari', 2, null, true),
  ('Thaal', 'thaal', 3, null, true),
  ('Traffic', 'traffic', 4, 'male'::public.gender, true),
  ('Sherbet', 'sherbet', 5, null, true),
  ('Daig', 'daig', 6, 'male'::public.gender, true)
on conflict (slug) do update
set
  name = excluded.name,
  display_order = excluded.display_order,
  gender_restriction = excluded.gender_restriction,
  is_active = excluded.is_active;

-- Default capacity rules (linear mode for each duty)
-- Note: clear_all_data.sql truncates duty_capacity_rules, so in the normal
-- reset workflow these inserts will not create duplicates.
insert into public.duty_capacity_rules (duty_id, capacity_mode, base_count, per_daig_count)
select id, 'linear'::public.capacity_mode, 2, 1.5 from public.duties where slug = 'provider'
union all
select id, 'linear'::public.capacity_mode, 2, 1.0 from public.duties where slug = 'dari'
union all
select id, 'linear'::public.capacity_mode, 2, 1.0 from public.duties where slug = 'thaal'
union all
select id, 'linear'::public.capacity_mode, 1, 0.5 from public.duties where slug = 'traffic'
union all
select id, 'linear'::public.capacity_mode, 1, 0.5 from public.duties where slug = 'sherbet'
union all
select id, 'linear'::public.capacity_mode, 1, 0.5 from public.duties where slug = 'daig';

-- Traffic duty: tiered rules
insert into public.duty_capacity_rules (duty_id, capacity_mode, tier_min_daigs, tier_max_daigs, tier_capacity)
select id, 'tiered'::public.capacity_mode, 1, 5, 4 from public.duties where slug = 'traffic'
union all
select id, 'tiered'::public.capacity_mode, 6, 10, 8 from public.duties where slug = 'traffic'
union all
select id, 'tiered'::public.capacity_mode, 11, null, 12 from public.duties where slug = 'traffic';

-- Default app_config entries (upsert by key so this is idempotent)
insert into public.app_config (key, value, description) values
  ('assignment_rules', '{
    "history_lookback": "current_season",
    "waitlist_auto_fill": true,
    "male_priority_order": ["provider", "dari", "traffic", "daig", "thaal", "sherbet"],
    "female_priority_order": ["thaal", "female-provider", "female-dari", "provider", "dari", "sherbet"]
  }'::jsonb, 'Auto-assignment algorithm configuration'),
  ('ai_calling', '{
    "enabled": false,
    "provider": "retell",
    "retell_api_key": "",
    "retell_agent_id": "",
    "retell_from_number": "",
    "stagger_delay_ms": 2000,
    "auto_call_hours_before_sunset": 2
  }'::jsonb, 'Retell AI phone calling configuration'),
  ('whatsapp', '{
    "enabled": false,
    "confirm_keywords": ["confirm", "yes", "haan", "ji", "ha", "han"],
    "cancel_keywords": ["cancel", "no", "nahi", "nhi"],
    "rate_limit_per_second": 1,
    "rate_limit_burst": 5
  }'::jsonb, 'WhatsApp messaging configuration'),
  ('reminder_defaults', '{
    "reminders": [
      {
        "type": "first_reminder",
        "hours_before_sunset": 6,
        "template": "Assalam o Alaikum {name}! Reminder: You are assigned to {duty} for {drive_name} today at {location}. Sunset is at {sunset_time}. Please confirm by replying YES."
      },
      {
        "type": "second_reminder",
        "hours_before_sunset": 3,
        "template": "Reminder: {name}, please confirm your attendance for {duty} at {drive_name}. Sunset at {sunset_time}."
      },
      {
        "type": "final_reminder",
        "hours_before_sunset": 1.5,
        "template": "{name}, iftaar in 1.5 hours! Please head to {location} for your {duty} duty. JazakAllah Khair!"
      }
    ]
  }'::jsonb, 'Default reminder templates for new drives'),
  ('alerts', '{
    "notify_admins": true,
    "deficit_threshold_percent": 20
  }'::jsonb, 'Alert and notification thresholds')
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description;

COMMIT;

