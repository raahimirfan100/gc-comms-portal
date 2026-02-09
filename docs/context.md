# Project context — Grand Citizens Iftaar Drive Portal

**Last updated:** 2025-02-10 (initial creation after task list and context instructions)

## Current state

- **Done:** Dashboard layout (sidebar, topbar), auth pages (login, sign-up, forgot/update password, confirm route). Drives: list with season filter and capacity display, new drive form with sunset fetch and drive_duties + reminder_schedules creation, drive detail, assignments page with dnd-kit Kanban, calls page, live page, reminders page, drive-status-control. Volunteers: list with search/gender filter/pagination, new, import page, profile [id]. Duties: list, [id]/rules. Analytics and Settings pages (general, assignment, calling, reminders, whatsapp, sheets, alerts) exist. API: auth/confirm, public/auto-assign, assignments/batch, calls/trigger. lib/assignment/auto-assign (single, batch, promoteWaitlist) and tiered/linear capacity in code. Railway: Express server, WhatsApp manager, Retell client, Google Sheets sync, cron scheduler. Supabase full_schema.sql with seasons, drives, drive_duties, duties, duty_capacity_rules, volunteers, volunteer_availability, assignments, communication_log, reminder_schedules, whatsapp_sessions, google_sheets_sync, app_config. Public volunteer registration with drive selection, volunteer upsert, volunteer_availability, and auto-assign API call.
- **In progress / partial:** Many settings and sub-pages may be minimal (e.g. tiered capacity in createDrive may not be fully wired; reminder cron and WhatsApp keyword handling may be stubs). Drive templates, “Problems” drawer, audit log, and several PRD items are not implemented.
- **Not started:** See docs/REMAINING_FEATURES_AND_TASKS.md (sections 1–12). First logical tasks: 1.1.1 (drive templates DB), 1.2.1 (drive summary strip), or 2.1.1 (Sheets column mapping).

## What happened (recent)

- User removed unneeded files and requested: (1) a document tracking all remaining features and changes with individual tasks and how to accomplish them; (2) instructions for the AI to create/update a context.md so every new chat can get up to speed. Created docs/REMAINING_FEATURES_AND_TASKS.md and docs/CONTEXT_INSTRUCTIONS.md; created this initial docs/context.md.

## Issues found and how they were fixed

- **ESLint linting build artifacts:** `npm run lint` was scanning `.next/` and `node_modules/`, producing 19k+ errors. Fixed by adding `ignores: [".next/**", "node_modules/**", "railway-service/**"]` to `eslint.config.mjs`. App source still has 53 errors / 19 warnings (pre-existing).
- **API `/api/public/auto-assign` returned 500** on errors. Fixed: added try/catch in route; now returns 400 + JSON error message instead of 500.

## User suggestions

- Tasks should be given to each chat one by one for development. Context should track where we are, what happened, issues/fixes, user suggestions, and what to do next with a brief idea how.

## What to do next

- **Next task:** Pick one from docs/REMAINING_FEATURES_AND_TASKS.md (e.g. 1.1.1 Drive templates DB, or 1.2.1 Drive summary strip).
- **Brief idea:** Open the task doc, read the “How to accomplish” for the chosen task, read docs/DEVELOPER_GUIDE.md for schema and patterns, implement, then update this context.md with what was done and the next suggested task.
