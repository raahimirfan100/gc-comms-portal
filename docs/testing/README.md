# Comprehensive Testing Guide — Grand Citizens Iftaar Drive Portal

This folder contains everything the AI needs to **fully test the current application end-to-end**, using all available tools (including the browser) and to **keep a structured record** of what was tested, how, and any abnormalities.

---

## Instructions for the AI

### Your goals

1. **Run the full test suite** described in `E2E_SCENARIOS.md` (and any automated checks below).
2. **Use all tools at your disposal:**
   - **Browser (cursor-ide-browser MCP):** Verify every user flow in a real browser. Navigate, fill forms, click, and confirm redirects and visible outcomes. Do not skip browser verification for user-facing flows.
   - **Terminal:** Run `npm run build`, `npm run lint`, and `npm run dev` as needed. Run the app and keep it running when doing browser tests.
   - **Codebase inspection:** Grep/read to verify API routes, server actions, and env usage are correct.
3. **Record everything** in `TEST_LOG.md`: each functionality tested, how it was tested (browser / CLI / code), result (pass/fail/skip), and any abnormal behavior or bugs.

### Before you start

1. **Read** `docs/context.md` and `docs/testing/E2E_SCENARIOS.md`.
2. **Prerequisites (you may need the user to do these):**
   - **Test users:** At least one Supabase Auth user (email + password) so you can log in and test dashboard flows. If none exist, ask the user to create one in Supabase Dashboard (Authentication → Users → Add user) or via the app’s sign-up page.
   - **Test data (optional but recommended):** One active season and at least one drive (and optionally duties with capacity rules, volunteers) so that Drives list, drive detail, and Assignments have data. The user can create these via the app after logging in, or you can document “Needs seed data” and still test with empty state.
3. **Environment:** App should run with valid `.env.local` (Supabase URL and keys). Railway is optional for core dashboard tests.

### How to run tests

1. **Start the app:** `npm run dev` (keep it running; use a background terminal if needed).
2. **Automated checks (run once):**
   - `npm run build` — must succeed.
   - `npm run lint` — fix or document any reported issues.
3. **Browser tests:** For each scenario in `E2E_SCENARIOS.md`:
   - Use **cursor-ide-browser**: navigate to the URL, take a snapshot, perform the steps, take a snapshot after, and verify expected outcomes (URL, visible text, toasts, tables, etc.).
   - Follow the browser MCP workflow: `browser_navigate` → `browser_lock` → perform actions → `browser_unlock` when done.
4. **API / code-level checks:** Where scenarios mention “verify API” or “verify in code”, use grep/read or curl (with care for auth) to confirm behavior.

### After each test (or group of tests)

**Update `docs/testing/TEST_LOG.md`** with:

- **Functionality** — Short name (e.g. “Login with valid credentials”).
- **How tested** — “Browser: navigated to /auth/login, filled email/password, submitted; verified redirect to /drives.”
- **Result** — Pass / Fail / Skip (with reason).
- **Abnormalities** — Any error message, wrong redirect, missing element, console error, or unexpected behavior. If you fixed something, note “Fixed: …” in the log and update `docs/context.md` under “Issues found and how they were fixed”.

### If something fails

1. **Log the failure** in `TEST_LOG.md` with details.
2. **Attempt at most one fix at a time** (per user rules); validate that the fix works, then continue.
3. If the fix is not trivial, **document in `docs/context.md`** under “Issues found and how they were fixed” and suggest next steps.

### Scope

- Test **only** what exists in the current app (see `docs/context.md` and the app structure). Do not treat unimplemented features from the PRD as test failures; mark them as “N/A – not implemented” or “Skip” in the log.
- Focus on: auth, dashboard navigation, drives (list/create/detail/assignments/calls/live/reminders), volunteers (list/new/import/profile), duties (list/rules), analytics, settings pages, public volunteer registration, and API routes that are implemented.

---

## Document index (this folder)

| Document | Purpose |
|----------|--------|
| **README.md** (this file) | Instructions for the AI: use all tools, browser for flows, record in TEST_LOG, prerequisites. |
| **E2E_SCENARIOS.md** | Step-by-step end-to-end scenarios to execute (auth, drives, volunteers, assignments, public form, settings, APIs). |
| **TEST_LOG.md** | Living log: for each functionality, how it was tested, result, and abnormalities. The AI updates this as tests run. |

---

## Test user and data (for the user)

You may need to prepare the following so the AI can complete all scenarios:

1. **Supabase Auth test user**
   - Create at least one user (email + password) in Supabase:
     - **Option A:** Supabase Dashboard → Authentication → Users → “Add user” (set email and password).
     - **Option B:** Use the app’s `/auth/sign-up` page, then confirm email if confirmation is enabled (or disable email confirmation in Supabase for testing).
   - Share with the AI (or document in TEST_LOG): the test URL (e.g. `http://localhost:3000`), and whether a test user was created (no need to share the password in the doc; the AI can ask you to run a single login test if needed).

2. **Optional test data**
   - After logging in, create one **Season** (Settings → General) and mark it active.
   - Create one **Drive** (Drives → New) so that drive list, drive detail, and assignments have something to show. Optionally add **Volunteers** (manually or via public registration) so assignment and volunteer flows can be tested with data.

If you prefer not to create test users, the AI can still test: build/lint, public pages (landing, volunteer register), auth pages (login form render, sign-up form), and document “Skipped: dashboard flows require login” with a note that you need to add a test user for full E2E.
