-- Add description to duties (formattable rich text stored as markdown)
alter table public.duties add column if not exists description text;
