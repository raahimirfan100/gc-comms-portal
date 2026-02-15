# Remaining Features and Tasks — Grand Citizens Iftaar Drive Portal

This document tracks all remaining features and changes for the MVP. Each **feature** is broken into **tasks** that can be assigned to a chat one by one. Tasks include enough detail on how to accomplish them.

**References:** `docs/PRD.md`, `docs/DEVELOPER_GUIDE.md`, `README.md`, `supabase/full_schema.sql`.

---

## How to Use This Document

1. **Before starting a task:** Read `docs/context.md` so you know current project state. If it’s missing, create it using the template in `docs/CONTEXT_INSTRUCTIONS.md`.
2. **Pick one task** from the list below; do not bundle multiple tasks unless explicitly asked.
3. **After completing a task:** Update `docs/context.md` following the format and rules in `docs/CONTEXT_INSTRUCTIONS.md` (what was done, issues/fixes, user suggestions, next task and brief idea).

---

## 1. Drive Management

### 1.1 Drive templates (PRD §7)

**Goal:** Admins can create “Drive Templates” (e.g. Small / Medium / Large) that pre-fill duties and ratios when creating a drive.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 1.1.1 | Add DB support for drive templates | Add table `drive_templates` (name, slug, daig_count_default?, list of duty slugs + optional capacity overrides). Optionally add `drive_template_id` to `drives`. See schema patterns in `supabase/full_schema.sql`. |
| 1.1.2 | Drive template CRUD in Settings | Add Settings > General (or new “Templates” section): list templates, create/edit/delete. Form: name, default daig count, which duties to include, optional per-duty capacity overrides. |
| 1.1.3 | Use template when creating drive | On `/drives/new`, add template selector. On select: pre-fill name pattern, daig count, and (if applicable) which duties to create for the drive. Reuse existing `createDrive` flow; template only pre-fills form or suggests `drive_duties` creation. |

### 1.2 Drive detail summary strip and “recalculate needs” (PRD §7, §16)

**Goal:** Drive detail shows date, location, daigs, sunset/calling time clearly; when daig count changes, one-click “recalculate needs” and “fill from pool/standby”.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 1.2.1 | Drive summary strip on drive detail page | On `app/(dashboard)/drives/[id]/page.tsx`, add a clear summary strip: drive date, location name/address, expected people/daigs, sunset time, iftaar time, scheduled calling time (from app_config or drive-level config). Use existing drive fields and `app_config` for calling settings. |
| 1.2.2 | Recalculate capacity and fill from standby | Add “Recalculate needs” button: call existing logic that updates `drive_duties.calculated_capacity` when daig count changes (see `updateDrive` in `app/(dashboard)/drives/actions.ts`). Add “Fill from standby” button: call `promoteWaitlist(supabase, driveId)` from `lib/assignment/auto-assign.ts` and revalidate. Show toast with number of promoted. |

### 1.3 Sunset time and city (PRD §7, §10)

**Goal:** Drive creation uses city for sunset; sunset-based timing is visible and used for reminders/calls.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 1.3.1 | City field and Aladhan integration | Ensure drives have a city (or use a single default like Karachi). In `app/(dashboard)/drives/actions.ts`, `fetchSunsetTime` should accept city/date and call Aladhan API; store result in `drives.sunset_time` and `drives.sunset_source`. Add city dropdown or text field to drive form if not present. |
| 1.3.2 | Show sunset and calling time on drive and in settings | Display sunset time and “Call at: sunset ± X hours” on drive detail and in Settings > Calling. Read `app_config.ai_calling` for `auto_call_hours_before_sunset` (or equivalent). |

---

## 2. Volunteer Registry & Intake

### 2.1 Google Form / Sheets connection (PRD §6)

**Goal:** Dashboard pulls new signups from Google Form (via Sheets), with field mapping and duplicate handling.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 2.1.1 | Sheets sync: column-to-field mapping UI | In Settings > Sheets (or Volunteers > Import), allow admins to map sheet columns to volunteer fields (name, phone, email, organization, gender, etc.). Store mapping in `app_config` (e.g. `sheets_column_map`). Use existing `railway-service/src/sheets/sync.ts`; ensure sync reads this mapping. |
| 2.1.2 | Duplicate detection and “Possible duplicate” flag | When syncing or importing, compare by normalized phone and/or email. Flag volunteers as “Possible duplicate” (e.g. add `duplicate_of_id` or a flag in UI only). Show duplicates in Volunteers list with filter and in a “Problems” area. |
| 2.1.3 | One-click merge duplicates | Add action “Merge” that keeps one volunteer record, moves all `assignments` and `volunteer_availability` to the kept record, then deactivates or deletes the duplicate. Use server action or API with admin client. |
| 2.1.4 | Alert when form/sheet structure changes | If sheet columns change (new/renamed/removed), detect and show alert in Settings > Sheets: “Form structure changed. Please remap columns.” Compare last known column list (stored in `app_config` or `google_sheets_sync`) to current sheet header row. |

### 2.2 Public registration form improvements (PRD §6, §15)

**Goal:** Consent checkboxes, confirmation message after signup, and optional immediate WhatsApp add.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 2.2.1 | Consent checkboxes on registration form | On `app/volunteer/register/page.tsx`, add checkboxes: “I agree to be added to a WhatsApp group for coordination”; “I agree to receive reminders and AI confirmation calls.” Store consent in DB (e.g. add columns to `volunteers` or a `volunteer_consents` table). |
| 2.2.2 | Post-signup confirmation message (template) | After successful registration + auto-assign, show a configurable confirmation message (from `app_config` template, e.g. `signup_confirmation_message`). Substitute variables like {name}, {drive_names}, {duties}. |
| 2.2.3 | Optional: add to WhatsApp group after signup | If consent given and Settings specify “add immediately after signup”, call Railway `POST /api/whatsapp/group/add` for the volunteer’s phone and configured group JID. Log in `communication_log`. Handle failure with retry or “Needs attention” flag. |

### 2.3 Volunteer list: attendance history and “first-time” vs “repeat” (PRD §5, §8)

**Goal:** Volunteer directory shows attendance history and filter for first-time vs repeat.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 2.3.1 | Attendance history on volunteer profile | On `app/(dashboard)/volunteers/[id]/page.tsx`, load assignments (with drive name, date, duty, status). Show table or list of past drives and duties. Use `assignments` joined with `drives` and `duties`. |
| 2.3.2 | First-time vs repeat filter on Volunteers list | Compute “repeat” as: has at least one assignment with status in (completed, arrived, confirmed) for a past drive. Add filter dropdown “All / First-time / Repeat” and filter in query or in memory. |

---

## 3. Duty Board & Assignment

### 3.1 Kanban board polish (PRD §11.2)

**Goal:** Duty board shows required/assigned/cap, over-cap warning, underfilled badge, and audit note on override.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 3.1.1 | Required count and cap on columns | Ensure each duty column shows: required (min) count, current assigned, and cap if any. Use `drive_duties.calculated_capacity` or `manual_capacity_override` as cap; “required” can be same or a separate config. Green/yellow/red by comparing assigned vs required/cap. |
| 3.1.2 | Over-cap warning on drag | When dropping a volunteer into a duty column, if `current_assigned >= capacity`, show warning (e.g. toast or inline “Over cap”) and optionally allow or block drop. Update assignment and `current_assigned` via trigger. |
| 3.1.3 | “Changed by Admin” note on manual override | When admin drags a volunteer or changes assignment, set `is_manual_override = true` and store “Changed by [user] at [time]” (e.g. in a new `assignment_notes` or in existing notes field). Show this note on the volunteer card or tooltip. Requires auth user email/id in server action. |

### 3.2 Lock volunteer and lock duty roster (PRD §8.4)

**Goal:** Admins can lock a volunteer to a duty or lock a duty’s roster so auto-assign doesn’t change it.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 3.2.1 | Lock volunteer to duty | Add `is_locked` (or `locked_at` + `locked_by`) to `assignments`. When true, batch auto-assign and waitlist promotion must skip this assignment. UI: toggle “Lock” on the volunteer card on the duty board. |
| 3.2.2 | Lock duty roster | Add `roster_locked` to `drive_duties`. When true, do not add or remove volunteers from this duty via auto-assign or waitlist promotion. UI: toggle “Lock roster” on the duty column header. |

### 3.3 Add volunteer manually and mark standby (PRD §8.4, §12)

**Goal:** Admin can add a volunteer manually (walk-in) and mark someone as standby.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 3.3.1 | Add volunteer manually to drive | On drive assignments page, add “Add volunteer” (e.g. button per column or global). Open modal: search/select volunteer, select duty, then insert into `assignments` with status `assigned` and `is_manual_override = true`. If volunteer not in list, link to “Add volunteer” flow then return. |
| 3.3.2 | Mark as standby | Allow changing assignment status to a “standby” state (or use a separate standby list). If using existing statuses, consider “waitlisted” as standby; or add `is_standby` flag. Show standby list and “Promote” action to move into a duty when a spot opens. |

### 3.4 Waitlist promotion and replacement flow (PRD §12)

**Goal:** When someone cancels, system suggests standby candidate; admin can approve with one click; standby gets message.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 3.4.1 | On cancel: suggest standby and one-click approve | When admin marks assignment as cancelled, show a small flow: “Best standby: [name]”. “Approve” calls `autoAssignVolunteer` for that volunteer (after removing them from waitlist if applicable) and updates UI. Optionally call Railway to send “A spot opened up…” message. |
| 3.4.2 | Standby invitation message template | Add template in `app_config` (e.g. `standby_invitation_template`) and use it when notifying standby. Variables: {name}, {drive_name}, {drive_date}, {location}. Send via Railway WhatsApp when approved. |

---

## 4. WhatsApp & Reminders

### 4.1 WhatsApp group add and welcome message (PRD §9.1)

**Goal:** After signup or after assignment, add volunteer to configurable WhatsApp group and send welcome message.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 4.1.1 | Configure group per drive or global | In Settings > WhatsApp (and optionally per drive), allow setting “Default group JID” or “Drive group JID”. Store in `app_config` or `drives` table. |
| 4.1.2 | Welcome message template and send after add | Add `welcome_message_template` to config. After adding to group (Railway `addToGroup`), send welcome message via Railway. Log in `communication_log`. |

### 4.2 Reminder schedules and send (PRD §9.2)

**Goal:** Reminders at configurable times (e.g. 24h before, morning of, 2h before); templates with variables; cron sends them.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 4.2.1 | Reminder schedule UI per drive | On `app/(dashboard)/drives/[id]/reminders/page.tsx`, list `reminder_schedules` for the drive. Allow add/edit/delete: reminder type, `hours_before_sunset`, message template. Scheduled time can be computed and displayed from drive’s sunset_time. |
| 4.2.2 | Cron: send reminders at scheduled time | In `railway-service/src/cron/scheduler.ts`, ensure a job runs (e.g. every minute) that selects `reminder_schedules` where `is_sent = false` and `scheduled_at <= now()`, then for each drive/assignment fetches volunteers and sends WhatsApp message with template substitution. Mark `is_sent = true`, `sent_at = now()`. Use existing `reminder_defaults` and template variables from DEVELOPER_GUIDE. |

### 4.3 Simple reply handling: CONFIRM / CANCEL / HELP (PRD §9.3)

**Goal:** Inbound WhatsApp keywords CONFIRM, CANCEL, HELP update assignment and optionally notify admin.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 4.3.1 | Keyword detection in Railway | In Railway WhatsApp handler (inbound message), normalize text and check against `app_config.whatsapp.confirm_keywords`, `cancel_keywords`. If match: find volunteer by phone, find assignment for upcoming drive, update status to `confirmed` or `cancelled`. Log in `communication_log`. |
| 4.3.2 | HELP keyword and admin notify | If message matches “help” keyword, send preset help reply (from `app_config`) and optionally create an alert or log for admin (e.g. in `communication_log` with a flag, or a simple `alerts` table). |
| 4.3.3 | Auto-reply for unknown replies | If message is not confirm/cancel/help, send “Please reply CONFIRM, CANCEL, or HELP” (template from config) and optionally flag for admin review. |

---

## 5. AI Calling

### 5.1 Sunset-based calling time and config (PRD §10)

**Goal:** Call at a configurable time relative to sunset; configurable audience (all / unconfirmed / standby) and retry rules.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 5.1.1 | Calling config UI | Settings > Calling: city for sunset (or use drive’s city), “Call at sunset ± X minutes”, audience (all signups / only unconfirmed / only standby), retry (once vs multiple, stop if confirmed). Save to `app_config.ai_calling`. |
| 5.1.2 | Calls page: trigger batch and show status | On `app/(dashboard)/drives/[id]/calls/page.tsx`, allow selecting volunteers (or “All unconfirmed”) and “Trigger calls”. Call `POST /api/calls/trigger` with driveId and volunteerIds. Show “Call initiated” and list recent `communication_log` rows for this drive (channel = ai_call) with call_result, duration, transcript link. |
| 5.1.3 | Railway: batch call and webhook | Ensure Railway `RetellClient.batchCall` calls Retell API with correct script and phone numbers. Implement webhook handler that receives call outcome, updates `communication_log` (call_result, duration, transcript) and updates `assignments.status` (e.g. confirmed / cancelled) when appropriate. |

### 5.2 Call outcome tracking and transcript (PRD §10)

**Goal:** Each call logs outcome (reached & confirmed, no answer, wrong number, etc.) and transcript.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 5.2.1 | Log call result and transcript | In Retell webhook handler, parse result and transcript from payload. Update `communication_log` row: `call_result`, `call_duration_seconds`, `call_transcript` (JSON). Map Retell statuses to enum `call_result`. |
| 5.2.2 | Show call history on drive calls page | Query `communication_log` where drive_id and channel = ai_call. Display table: volunteer name, sent_at, call_result, duration, link to transcript. |

---

## 6. Live Dashboard & Alerts

### 6.1 Real-time volunteer status (PRD §11, README)

**Goal:** Live dashboard shows volunteer check-in status (en route, arrived, completed, no-show) with real-time updates.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 6.1.1 | Check-in status updates | Allow duty leads or admins to change assignment status to en_route, arrived, completed, no_show (e.g. dropdown or buttons on live dashboard). Server action or API that updates `assignments.status` and optionally `checked_in_at`. |
| 6.1.2 | Supabase Realtime subscription | On `app/(dashboard)/drives/[id]/live/page.tsx`, subscribe to `assignments` for this drive (filter by drive_id). On payload, update local state so the board reflects status changes without refresh. |
| 6.1.3 | Deficit alerts | When a duty has fewer confirmed/arrived than threshold (e.g. 80% of required), show red badge or “Deficit” alert. Use `app_config.alerts.deficit_threshold_percent`. Optionally notify admins (future: email or in-app). |

---

## 7. Analytics & Reporting

### 7.1 Per-drive reports (PRD §13)

**Goal:** Per drive: final roster by duty (exportable), attendance/confirmation stats, cancellation window.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 7.1.1 | Roster export | On drive detail or assignments page, add “Export roster” button. Generate CSV (or XLSX) with columns: volunteer name, phone, duty, status, confirmed_at. Use server action that fetches assignments with volunteers and duties, then returns file download. |
| 7.1.2 | Attendance/confirmation stats | On drive detail or analytics, show for the drive: total assigned, confirmed count, cancelled count, no-show count, and percentages. Simple aggregates from `assignments` for that drive. |
| 7.1.3 | Cancellation window (optional) | Query `assignments` where status = cancelled and group by hour or day before drive. Show “Most cancellations occurred X hours before” for planning. |

### 7.2 Season-level analytics (PRD §13, README)

**Goal:** Leaderboards, retention (repeat volunteers), duty distribution.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 7.2.1 | Volunteer leaderboard | On `app/(dashboard)/analytics/page.tsx`, add section: top volunteers by number of completed/attended drives in the season. Query: count assignments where status in (completed, arrived) group by volunteer_id, join volunteers, order by count desc. |
| 7.2.2 | Retention and duty distribution | Charts: % repeat vs first-time volunteers; bar chart of duty distribution (how many times each duty was filled). Use Recharts; data from `assignments` and `volunteers`. |

---

## 8. Settings & Config

### 8.1 Assignment rules UI (PRD §8)

**Goal:** Admins can edit priority orders, repeat-volunteer rules, spillover behavior, and gender toggles in the UI.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 8.1.1 | Assignment rules editor | Settings > Assignment: load `app_config.assignment_rules` (male_priority_order, female_priority_order, repeat_lookback_drives, etc.). Form: reorder duty slugs for male/female, number of past drives for “repeat”, spillover behavior (move to next / standby / manual review). Save back to `app_config`. |
| 8.1.2 | Gender-based routing toggle | Add toggle “Use gender-based duty routing”. When off, auto-assign ignores gender_restriction (or uses a single combined order). Persist in assignment_rules and respect in `lib/assignment/auto-assign.ts`. |

### 8.2 Message and call templates (PRD §14)

**Goal:** Editable templates for signup confirmation, welcome, assignment, reminders, location/map, call script, help response, cancellation ack, standby invitation.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 8.2.1 | Templates in app_config and Settings UI | Define template keys in app_config (e.g. signup_confirmation, welcome_whatsapp, assignment_message, reminder_*, location_message, call_script, help_response, cancellation_ack, standby_invitation). Settings > Reminders (or new “Templates”) page: list templates, text area per template, variable hints ({name}, {duty}, etc.). Save as JSON in app_config. |
| 8.2.2 | Use templates in flows | Where messages are sent (registration success, WhatsApp add, assignment notification, reminders, calls, help reply, cancel ack, standby invite), read the corresponding template from config, substitute variables, then send. |

### 8.3 Alerts and “Problems” drawer (PRD §11.3)

**Goal:** Single “Problems” drawer: duplicates, missing phones, failed WhatsApp adds, underfilled duties, unconfirmed near deadline.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 8.3.1 | Problems aggregation | Create a server-side helper or API that returns: duplicates (volunteers with same phone/email), missing phone (volunteers with null/empty phone), failed WhatsApp adds (from communication_log or a flag), drives with underfilled duties (current_assigned < required), unconfirmed count for upcoming drives within 24h. |
| 8.3.2 | Problems drawer UI | On dashboard home or drive detail, add “Problems” drawer/panel that lists the above with links to fix (e.g. “Merge duplicates” → volunteers, “Underfilled: Provider” → drive assignments). |

---

## 9. Safety, Consent & Audit

### 9.1 STOP and opt-out (PRD §15)

**Goal:** Reply STOP → configurable behavior (stop messages, stop calls, or both); respect in WhatsApp and calling.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 9.1.1 | Store opt-out on volunteer | Add `opt_out_whatsapp` and `opt_out_calls` (or single `opt_out_at`) to `volunteers`. When inbound message is “STOP” (or configurable keyword), set flags and send acknowledgement. |
| 9.1.2 | Respect opt-out in sends and calls | Before sending WhatsApp reminder or triggering AI call, check volunteer’s opt-out flags. Skip if opted out. Log that skip happened. |

### 9.2 Audit log (PRD §15)

**Goal:** Log who changed assignments, who sent messages, who triggered calling.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 9.2.1 | Audit log table and writes | Add table `audit_log` (id, actor_id, actor_email, action, entity_type, entity_id, details jsonb, created_at). In server actions and API routes (assignment change, send message, trigger calls), get current user from Supabase auth and insert a row. |
| 9.2.2 | Audit log viewer (optional) | Settings > Audit or dedicated page: list recent audit entries with filter by action/entity. Read-only. |

---

## 10. Edge Cases & Data Quality (PRD §16)

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 10.1 | Missing phone flag | In Volunteers list and Problems drawer, flag volunteers with missing or invalid phone. Block “Send message” / “Call” for them and show tooltip “Add phone number first”. |
| 10.2 | Multi-day signup handling | When volunteer signs up for multiple drives, current flow assigns per drive. Document or add UI hint: “Assigned to X drives. You can change duty per drive from the assignments board.” Optional: “Assign to specific drives only” vs “Pool for manual selection” in settings. |
| 10.3 | WhatsApp add failure retry | When adding to group fails (Railway returns error), log in communication_log and show in Problems or on volunteer/drive view. Add “Retry” button that calls Railway add-to-group again. |

---

## 11. Infrastructure & Auth

### 11.1 Season switching and default season

**Goal:** Topbar season selector works; all drive/volunteer lists and analytics scope by selected season.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 11.1.1 | Season selector in topbar | In `components/dashboard/topbar.tsx`, load seasons and show dropdown. Store selected season id in URL search param or context (e.g. `?season=id` or React context). When no season selected, use `is_active` season. |
| 11.1.2 | Scope queries by selected season | Drives list, analytics, and any season-scoped data should use the selected season id from topbar. Pass as param or read from context. |

### 11.2 RLS and permissions (PRD §4)

**Goal:** Only approved admins can access dashboard; optional roles (Super Admin, Drive Admin, Duty Lead, Viewer).

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 11.2.1 | RLS policies for dashboard tables | Ensure `seasons`, `drives`, `volunteers`, `assignments`, etc. have RLS policies that allow read/write only for authenticated users (or users in an `admins`/`profiles` table). Use service role for server-side admin operations where appropriate. See DEVELOPER_GUIDE and Supabase docs. |
| 11.2.2 | Role-based access (optional) | If needed, add `profiles` table with user_id and role (super_admin, drive_admin, duty_lead, viewer). Middleware or server checks role before allowing access to certain routes or actions. Viewer = read-only. |

### 11.3 Email confirmation and auth flows

**Goal:** Sign-up and password reset work; email OTP confirmation works.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 11.3.1 | Auth confirm route | Ensure `app/auth/confirm/route.ts` exchanges token hash for session and redirects to dashboard or sign-up-success. See Supabase Auth docs for email OTP. |
| 11.3.2 | Forgot / update password | Ensure forgot-password and update-password flows work with Supabase Auth (recover link, then update password on the update page). |

---

## 12. Railway Service Completion

### 12.1 Cron jobs (DEVELOPER_GUIDE)

**Goal:** All 7 cron jobs implemented: reminders, sheets sync, AI calls (sunset-based), drive status transition, sunset update, waitlist promotion, health.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 12.1.1 | Reminders cron | Already described in 4.2.2. Run every minute; send pending reminders via WhatsApp. |
| 12.1.2 | Sheets sync cron | Schedule periodic sync (e.g. every 15 min). Call `sheetsSync.syncAll()` and handle errors (store in google_sheets_sync.sync_errors). |
| 12.1.3 | AI calls cron (sunset-based) | Job at configured time (e.g. sunset - 60 min): find drives with drive_date = today, get unconfirmed volunteers, call `RetellClient.batchCall`. Respect app_config.ai_calling. |
| 12.1.4 | Drive status transition | Hourly: drives with drive_date = today and status = open → set in_progress; drives with drive_date < today and status = in_progress → set completed. |
| 12.1.5 | Sunset update (optional) | Daily: refresh sunset_time for upcoming drives from Aladhan if not manually overridden. |
| 12.1.6 | Waitlist promotion cron | Periodically call `promoteWaitlist` for drives that are open and have cancellations (optional automation). |
| 12.1.7 | Health / logging | Ensure health endpoint and structured logging for cron runs and errors. |

### 12.2 Tiered capacity in drive creation

**Goal:** When creating drive_duties, support tiered capacity rules from `duty_capacity_rules`.

| Task ID | Description | How to accomplish |
|--------|-------------|--------------------|
| 12.2.1 | Tiered capacity in createDrive | In `app/(dashboard)/drives/actions.ts`, when building drive_duties, if a duty has tiered rules, use the tier matching drive’s daig_count (tier_min_daigs <= daig_count <= tier_max_daigs) and set calculated_capacity from tier_capacity. Reuse or call DB function `calculate_duty_capacity` if it exists in schema. |

---

## Task Summary (Checklist)

Use this as a quick checklist; full detail is in the sections above.

- [ ] 1.1.1 – Drive templates DB
- [ ] 1.1.2 – Drive templates CRUD UI
- [ ] 1.1.3 – Use template on create drive
- [ ] 1.2.1 – Drive summary strip
- [ ] 1.2.2 – Recalculate needs + fill from standby
- [ ] 1.3.1 – City + Aladhan
- [ ] 1.3.2 – Sunset/calling time display
- [ ] 2.1.1 – Sheets column mapping
- [ ] 2.1.2 – Duplicate detection
- [ ] 2.1.3 – Merge duplicates
- [ ] 2.1.4 – Form change alert
- [ ] 2.2.1 – Consent checkboxes
- [ ] 2.2.2 – Post-signup confirmation template
- [ ] 2.2.3 – WhatsApp add after signup (optional)
- [ ] 2.3.1 – Volunteer profile attendance history
- [ ] 2.3.2 – First-time / repeat filter
- [ ] 3.1.1 – Required/cap on columns
- [ ] 3.1.2 – Over-cap warning
- [ ] 3.1.3 – “Changed by Admin” note
- [ ] 3.2.1 – Lock volunteer
- [ ] 3.2.2 – Lock duty roster
- [ ] 3.3.1 – Add volunteer manually
- [ ] 3.3.2 – Mark standby
- [ ] 3.4.1 – Cancel → suggest standby + approve
- [ ] 3.4.2 – Standby invitation template
- [ ] 4.1.1 – WhatsApp group config
- [ ] 4.1.2 – Welcome message
- [ ] 4.2.1 – Reminder schedule UI per drive
- [ ] 4.2.2 – Cron send reminders
- [ ] 4.3.1 – CONFIRM/CANCEL keyword handling
- [ ] 4.3.2 – HELP + admin notify
- [ ] 4.3.3 – Auto-reply unknown
- [ ] 5.1.1 – Calling config UI
- [ ] 5.1.2 – Calls page trigger + status
- [ ] 5.1.3 – Railway batch + webhook
- [ ] 5.2.1 – Log call result/transcript
- [ ] 5.2.2 – Call history on calls page
- [ ] 6.1.1 – Check-in status updates
- [ ] 6.1.2 – Realtime subscription
- [ ] 6.1.3 – Deficit alerts
- [ ] 7.1.1 – Roster export
- [ ] 7.1.2 – Attendance stats per drive
- [ ] 7.1.3 – Cancellation window (optional)
- [ ] 7.2.1 – Leaderboard
- [ ] 7.2.2 – Retention + duty distribution charts
- [ ] 8.1.1 – Assignment rules editor
- [ ] 8.1.2 – Gender routing toggle
- [ ] 8.2.1 – Templates in config + UI
- [ ] 8.2.2 – Use templates in flows
- [ ] 8.3.1 – Problems aggregation
- [ ] 8.3.2 – Problems drawer UI
- [ ] 9.1.1 – Opt-out storage
- [ ] 9.1.2 – Respect opt-out
- [ ] 9.2.1 – Audit log table + writes
- [ ] 9.2.2 – Audit viewer (optional)
- [ ] 10.1 – Missing phone flag
- [ ] 10.2 – Multi-day signup (hint/optional)
- [ ] 10.3 – WhatsApp add retry
- [ ] 11.1.1 – Season selector topbar
- [ ] 11.1.2 – Scope by season
- [ ] 11.2.1 – RLS policies
- [ ] 11.2.2 – Roles (optional)
- [ ] 11.3.1 – Auth confirm
- [ ] 11.3.2 – Forgot/update password
- [ ] 12.1.1–12.1.7 – Cron jobs
- [ ] 12.2.1 – Tiered capacity in createDrive
