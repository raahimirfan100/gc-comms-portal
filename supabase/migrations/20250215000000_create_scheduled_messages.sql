-- Scheduled messages for WhatsApp (and future channels).
-- Supports individual volunteer messages, group messages, and drive-scoped messages.
create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  drive_id uuid references public.drives(id) on delete set null,
  volunteer_id uuid references public.volunteers(id) on delete cascade,
  group_jid text,
  channel text not null default 'whatsapp',
  message text not null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

-- Index for the cron job: find pending messages due for sending
create index if not exists idx_scheduled_messages_pending
  on public.scheduled_messages (scheduled_at)
  where status = 'pending';

-- Index for listing by drive
create index if not exists idx_scheduled_messages_drive
  on public.scheduled_messages (drive_id)
  where drive_id is not null;

comment on table public.scheduled_messages is 'Queue of scheduled WhatsApp messages to volunteers or groups';
