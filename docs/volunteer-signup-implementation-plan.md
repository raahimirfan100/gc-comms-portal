# Volunteer Sign-Up Form – Implementation Plan

## Summary

- **Admin:** New settings page to configure how drives are chosen for the sign-up form (rolling window: next N days, next M drives, or manual date range).
- **Public form:** Multi-stage flow: (1) phone → (2) details (pre-filled if returning) → (3) drive selection (rolling window, pre-checked if returning) → submit (existing flow: upsert volunteer, volunteer_availability, auto-assign).

---

## 1. Config: Sign-up form window

### 1.1 Storage

- **Where:** `app_config` table, new key `signup_form_window`.
- **Who can edit:** Authenticated (dashboard) only. Public form only reads via a server API.

### 1.2 Shape

```ts
{
  mode: "next_n_days" | "next_m_drives" | "manual";
  // For mode === "next_n_days"
  days?: number;           // e.g. 7
  // For mode === "next_m_drives"
  drive_count?: number;    // e.g. 2
  // For mode === "manual"
  start_date?: string;     // ISO date, inclusive
  end_date?: string;       // ISO date, inclusive
}
```

### 1.3 Behaviour

- **next_n_days:** Show drives where `drive_date >= today` and `drive_date <= today + days`, within active season, status `open` or `draft`, ordered by date.
- **next_m_drives:** Same season + status, `drive_date >= today`, ordered by date, take first `drive_count` drives.
- **manual:** Same season + status, `drive_date >= start_date` and `drive_date <= end_date`, ordered by date.

If no config or missing fields, fallback: e.g. `next_n_days` with `days: 7`.

### 1.4 Seed / migration

- Add default row in `reseed_defaults.sql`: `signup_form_window` with `{ "mode": "next_n_days", "days": 7 }`.
- Optional: one-time migration to insert the key if not present (or rely on reseed).

---

## 2. Admin: Sign-up form settings page

### 2.1 Route

- **Path:** `app/(dashboard)/settings/signup-form/page.tsx` (new).
- **Nav:** Add “Sign-up form” (or “Volunteer sign-up”) under Settings in the dashboard nav/sidebar.

### 2.2 UI

- **Mode selector:** Radio or select: “Next N days” | “Next M drives” | “Manual date range”.
- **Conditional fields:**
  - **Next N days:** Number input “Number of days” (min 1, e.g. max 31).
  - **Next M drives:** Number input “Number of drives” (min 1, e.g. max 10).
  - **Manual:** Two date inputs “From date” and “To date” (both required when manual).
- **Save:** Update `app_config` for key `signup_form_window` (authenticated Supabase client).
- **Copy link:** Optional short section showing the public form URL `/volunteer/register` and a “Copy link” button.

### 2.3 Validation

- For chosen mode, ensure the relevant fields are set and valid (e.g. manual: start_date ≤ end_date, dates not in the past if that’s a product rule).

---

## 3. Public API: Sign-up context (drives + optional pre-fill)

### 3.1 Endpoint

- **Method/URL:** `GET /api/public/signup-context?phone=...`
  - `phone` optional. If omitted, only drives are returned (no volunteer/pre-fill).

### 3.2 Behaviour

1. **Config:** Server reads `app_config.signup_form_window` (server Supabase/admin client; anon cannot read app_config).
2. **Active season:** Get current active season (e.g. `is_active = true`).
3. **Drives:** Query drives: `season_id = active`, status in `['open','draft']`, and apply window filter per config (see 1.3). Return list: e.g. `{ id, name, drive_date, location_name }`.
4. **If `phone` provided:**
   - Normalize phone (reuse existing `normalizePhone`).
   - Look up volunteer by `phone` (single row).
   - If found: return pre-fill: `{ name, email, gender, organization }` and `existingDriveIds`: list of `drive_id` for which this volunteer has a row in `volunteer_availability` and that drive is in the drives list from step 3.
   - If not found: return `volunteer: null`, `existingDriveIds: []`.

### 3.3 Response shape

```ts
{
  drives: { id: string; name: string; drive_date: string; location_name: string | null }[];
  volunteer?: { name: string; email: string | null; gender: string; organization: string | null } | null;
  existingDriveIds?: string[];
}
```

### 3.4 Security / abuse

- No auth required (public form).
- Consider optional rate limit by IP or phone for this route if needed later.
- Return only fields necessary for pre-fill; no internal IDs beyond drive ids needed for the form.

---

## 4. Volunteer form: Multi-stage flow

### 4.1 Route

- **Path:** Unchanged: `app/volunteer/register/page.tsx`.
- **URL:** `/volunteer/register` (single shareable link).

### 4.2 Stage 1: Phone

- **UI:** Short step: title/description, phone number input, “Continue” button.
- **Copy:** “Use the same number you’ve used before if you’ve signed up before, so we can load your details.”
- **Action:** On Continue, call `GET /api/public/signup-context?phone=<normalized>`.
- **Next:** Store in component state: `phone`, `drives`, `volunteer` (pre-fill or null), `existingDriveIds`. Move to Stage 2.

### 4.3 Stage 2: Details

- **UI:** Fields: Full name, Email, Gender, Organization (same as current form). All editable.
- **Pre-fill:** If `volunteer` from API, pre-fill name, email, gender, organization. Otherwise empty.
- **Validation:** Name and gender required (and phone already from step 1).
- **Action:** “Next” or “Continue” → validate, store details in state, move to Stage 3.

### 4.4 Stage 3: Drive selection

- **UI:** List of drives from `drives` (rolling window). Each drive: checkbox + label (name, date, optional location). Same agreement checkbox as today (“I agree to volunteer…”).
- **Pre-fill:** For each drive in `existingDriveIds`, pre-check the checkbox. New signups: all unchecked.
- **Action:** “Sign up” / “Submit” → same as current submit.

### 4.5 Submit (unchanged flow)

- Use collected state: phone, name, email, gender, organization, selected drive IDs.
- Upsert `volunteers` (by phone), source `in_app_form`.
- Upsert `volunteer_availability` for each selected drive (onConflict volunteer_id + drive_id), source `in_app_form`.
- Call existing `POST /api/public/auto-assign` with `{ volunteerId, driveIds }`.
- Show existing success view (thank-you, duty assignments, WhatsApp reminder note).

### 4.6 Edge cases

- **No drives in window:** After Stage 1 (or on load if we ever load drives without phone), if `drives.length === 0`, show message: “No drives are available for sign-up right now. Please check back later.” Do not show Stage 2/3 until there are drives (or block at Stage 3 with same message).
- **Back:** Optional “Back” on Stage 2 to Stage 1 (change phone), and Stage 3 to Stage 2 (change details). State stays in memory.
- **Browser refresh:** State is lost; user restarts from Stage 1. No persistence of partial progress required for v1.

---

## 5. Implementation order

| # | Task | Notes |
|---|------|--------|
| 1 | Config shape + default | Add `signup_form_window` to `reseed_defaults.sql` (and optional migration). |
| 2 | Public API | `GET /api/public/signup-context` with config + drives + optional phone lookup. |
| 3 | Admin settings page | New page under Settings, read/write `signup_form_window`, nav link. |
| 4 | Form Stage 1 | Phone input, call signup-context, store drives + volunteer + existingDriveIds. |
| 5 | Form Stage 2 | Details form, pre-filled from volunteer, store in state. |
| 6 | Form Stage 3 | Drive checkboxes from drives, pre-check existingDriveIds, agreement checkbox. |
| 7 | Form submit | Wire submit to existing logic (upsert volunteer, availability, auto-assign). |
| 8 | Empty state + back | No drives message; optional Back buttons. |

---

## 6. What stays the same

- Single shareable URL: `/volunteer/register`.
- No login; anon access.
- Submit: upsert volunteer by phone, volunteer_availability, auto-assign API, success screen with duty list and WhatsApp note.
- RLS: anon insert on volunteers and volunteer_availability as today; no new anon read on volunteers (pre-fill via server API only).
- No change to auto-assign logic, duty board, or WhatsApp flows.

---

## 7. Out of scope (later)

- “Send me a reminder” checkbox and wiring to reminder system.
- Volunteer self-service cancel (e.g. link from WhatsApp or magic link).
- Persisting partial form progress (e.g. localStorage) across refresh.
