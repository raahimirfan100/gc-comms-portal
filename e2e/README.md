# E2E tests (Playwright)

Tests run in **user-flow order** (by file name):

| Phase | File | Flow |
|-------|------|------|
| 1 | phase1-public.spec.ts | Landing, volunteer registration (no login) |
| 2 | phase2-auth.spec.ts | Login, sign-up, forgot password |
| 3 | phase3-dashboard.spec.ts | Sidebar: Drives, Volunteers, Duties, Analytics, Settings, logout |
| 4 | phase4-drives.spec.ts | Drive list, create, detail, Duty Board, Calls, Live, Reminders |
| 5 | phase5-volunteers.spec.ts | Volunteer list, add, profile, import |
| 6 | phase6-duties.spec.ts | Duty list, duty rules |
| 7 | phase7-settings.spec.ts | General, Assignment, Calling, Reminders, WhatsApp, Sheets, Alerts |
| 8 | phase8-edge.spec.ts | Protected route redirect, invalid drive/volunteer ID |

**Run:** `npm run test:e2e` or `npm run test:e2e:headed`

**Phases 3–7** need `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` (Supabase Auth user); otherwise those tests are skipped.
