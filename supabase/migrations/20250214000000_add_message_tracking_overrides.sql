-- Add manual override columns for message sent and acknowledged on assignments.
-- When null, values are derived from communication_log and assignment status.
-- When set, the override takes precedence.
alter table public.assignments
  add column if not exists message_sent_override boolean,
  add column if not exists message_acknowledged_override boolean;

comment on column public.assignments.message_sent_override is 'Manual override: null = auto from communication_log, true/false = force value';
comment on column public.assignments.message_acknowledged_override is 'Manual override: null = auto from confirmed_at, true/false = force value';
