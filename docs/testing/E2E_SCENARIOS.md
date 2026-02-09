# End-to-End Test Scenarios

Execute these scenarios in order where possible. Use the **browser** for every user flow; use terminal/code for build, lint, and API checks. Record results in `TEST_LOG.md`.

---

## 0. Pre-flight (no browser)

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 0.1 | Build | `npm run build` | Exit 0, no build errors. |
| 0.2 | Lint | `npm run lint` | No errors (fix or document). |
| 0.3 | Dev server | `npm run dev` | Server starts; next message suggests local URL (e.g. localhost:3000). |

---

## 1. Public pages (no login)

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 1.1 | Landing page | Navigate to `/`. | Page loads; no crash; visible content (hero/CTA or similar). |
| 1.2 | Volunteer registration page | Navigate to `/volunteer/register`. | Form visible: name, phone, email(?), gender, drive selection. No console errors. |
| 1.3 | Volunteer registration submit | Fill name, phone, gender, select at least one drive; submit. | Request succeeds (no 5xx); success message or confirmation; if backend is up, volunteer and volunteer_availability created and auto-assign API called. |

---

## 2. Auth pages (no login yet)

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 2.1 | Login page | Navigate to `/auth/login`. | Login form visible (email, password, submit). Links to sign-up/forgot if present. |
| 2.2 | Sign-up page | Navigate to `/auth/sign-up`. | Sign-up form visible; submit leads to sign-up-success or error. |
| 2.3 | Forgot password | Navigate to `/auth/forgot-password`. | Form to request reset; submit behaves (e.g. “Check your email” or error). |
| 2.4 | Login with invalid credentials | On `/auth/login`, enter wrong email/password; submit. | Error message shown; stay on login page. |
| 2.5 | Login with valid credentials | On `/auth/login`, enter valid test user email/password; submit. | Redirect to `/drives` (or configured post-login path); dashboard layout visible (sidebar, topbar). |

---

## 3. Dashboard navigation (after login)

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 3.1 | Sidebar: Drives | Click “Drives” (or equivalent). | Navigate to `/drives`; drive list or “No active season” / empty state. |
| 3.2 | Sidebar: Volunteers | Click “Volunteers”. | Navigate to `/volunteers`; volunteer list or empty state. |
| 3.3 | Sidebar: Duties | Click “Duties”. | Navigate to `/duties`; duty list. |
| 3.4 | Sidebar: Analytics | Click “Analytics”. | Navigate to `/analytics`; page loads. |
| 3.5 | Sidebar: Settings | Click “Settings” or open submenu. | Settings section or sub-pages (General, Assignment, etc.) accessible. |
| 3.6 | Topbar: theme / logout | Use theme switcher (if present); click logout. | Theme changes; logout redirects to login or home. |

---

## 4. Drives

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 4.1 | Drive list | Go to `/drives`. | List of drives for active season, or “No active season” / empty message. Cards/rows show name, date, location, capacity info if data exists. |
| 4.2 | Create drive (no active season) | With no active season, try “New drive” or equivalent. | Either blocked with message or form loads; if form loads, season selector or warning. |
| 4.3 | Create drive (with active season) | Ensure one active season exists. Go to `/drives/new`. Fill name, date, location, daig count; optionally fetch sunset; submit. | Drive created; redirect to drive list or detail; new drive appears. |
| 4.4 | Drive detail | From drive list, open a drive. | Navigate to `/drives/[id]`; drive info visible; links/tabs to Assignments, Calls, Live, Reminders. |
| 4.5 | Drive status control | On drive detail, change status (e.g. draft → open) if UI allows. | Status updates; UI reflects new status. |
| 4.6 | Assignments page | Open drive → Assignments. | Kanban board with duty columns; volunteers as cards if data exists. No crash. |
| 4.7 | Batch auto-assign | On Assignments, trigger “Batch assign” / “Auto-assign” if button exists. | Request succeeds; assignments appear or toast with result. |
| 4.8 | Drag volunteer (if data) | If there are assignments, drag a volunteer to another duty column. | Drop works; column counts update (or over-cap warning if implemented). |
| 4.9 | Calls page | Open drive → Calls. | Page loads; trigger-call UI or “not configured” message. |
| 4.10 | Live page | Open drive → Live. | Page loads; real-time or static roster view. |
| 4.11 | Reminders page | Open drive → Reminders. | Page loads; list or form for reminder schedules. |

---

## 5. Volunteers

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 5.1 | Volunteer list | Go to `/volunteers`. | Table or list; search and gender filter work; pagination if present. |
| 5.2 | Add volunteer | Go to `/volunteers/new`. Fill name, phone, gender, etc.; submit. | Volunteer created; redirect to list or profile; new volunteer appears. |
| 5.3 | Volunteer profile | From list, open a volunteer. | Navigate to `/volunteers/[id]`; profile and/or assignment history. |
| 5.4 | Import page | Go to `/volunteers/import`. | Page loads; Google Sheets or upload UI; no crash. |

---

## 6. Duties

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 6.1 | Duty list | Go to `/duties`. | List of duty types. |
| 6.2 | Duty capacity rules | Open a duty → Rules (or `/duties/[id]/rules`). | Form for linear/tiered capacity; save works if implemented. |

---

## 7. Settings

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 7.1 | General | Go to `/settings/general`. | Seasons list; create/edit/activate season works. |
| 7.2 | Assignment | Go to `/settings/assignment`. | Page loads; assignment rules UI if present. |
| 7.3 | Calling | Go to `/settings/calling`. | Page loads; Retell/calling config if present. |
| 7.4 | Reminders | Go to `/settings/reminders`. | Page loads; default reminder templates if present. |
| 7.5 | WhatsApp | Go to `/settings/whatsapp`. | Page loads; connection/QR or config. |
| 7.6 | Sheets | Go to `/settings/sheets`. | Page loads; sheet mapping or sync config. |
| 7.7 | Alerts | Go to `/settings/alerts`. | Page loads. |

---

## 8. API routes (code or curl)

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 8.1 | Public auto-assign | POST `/api/public/auto-assign` with body `{ volunteerId, driveIds }` (valid UUIDs). | 200 and JSON (e.g. assignments or error); no 500. |
| 8.2 | Batch assign (auth) | POST `/api/assignments/batch` with session cookie, body `{ driveId }`. | 401 if not logged in; 200 with session. |
| 8.3 | Calls trigger (auth) | POST `/api/calls/trigger` with session, body `{ driveId, volunteerIds }`. | 401 if not logged in; with session either 200 or 4xx if Railway/Retell not configured. |

---

## 9. Auth confirm (optional)

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 9.1 | Confirm route | GET `/auth/confirm?token_hash=...&next=...` (valid token from Supabase). | Redirect to `next` or default with session set. |

---

## 10. Edge cases / robustness

| ID | What | Steps | Expected |
|----|------|--------|----------|
| 10.1 | Protected route without login | Log out; navigate to `/drives`. | Redirect to login (or 401). |
| 10.2 | Invalid drive ID | Navigate to `/drives/00000000-0000-0000-0000-000000000000`. | 404 or error message, no uncaught exception. |
| 10.3 | Invalid volunteer ID | Navigate to `/volunteers/00000000-0000-0000-0000-000000000000`. | 404 or error message. |

---

## Summary checklist (for TEST_LOG)

- [ ] 0.1 Build  
- [ ] 0.2 Lint  
- [ ] 0.3 Dev server  
- [ ] 1.1–1.3 Public pages  
- [ ] 2.1–2.5 Auth  
- [ ] 3.1–3.6 Dashboard nav  
- [ ] 4.1–4.11 Drives  
- [ ] 5.1–5.4 Volunteers  
- [ ] 6.1–6.2 Duties  
- [ ] 7.1–7.7 Settings  
- [ ] 8.1–8.3 API routes  
- [ ] 9.1 Auth confirm (if applicable)  
- [ ] 10.1–10.3 Edge cases  

Mark each as Pass / Fail / Skip in `TEST_LOG.md` and note abnormalities.
