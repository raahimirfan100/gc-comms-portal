# Logical Application Flow — E2E Test Structure

This document defines the logical flow the Grand Citizens Iftaar Drive Portal follows. Browser E2E tests should align with this flow to validate end-to-end user journeys.

---

## Flow Overview

```
Public (unauthenticated) → Auth → First-time Setup → Daily Operations → Edge Cases
```

---

## 1. Public / Unauthenticated

**User:** Anonymous visitor or volunteer

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 1.1 | `/` | Visit landing | Redirect to `/drives` (if session) or `/auth/login` |
| 1.2 | `/volunteer/register` | View registration form | Form: name, phone, email, gender, drive selection |
| 1.3 | `/volunteer/register` | Submit (when drives exist) | Success message; volunteer + volunteer_availability created; auto-assign called |

---

## 2. Auth

**User:** Admin / staff

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 2.1 | `/auth/login` | View login form | Email, password, forgot/sign-up links |
| 2.2 | `/auth/sign-up` | View sign-up form | Email, password, submit |
| 2.3 | `/auth/forgot-password` | Request reset | Form; submit → "Check your email" or error |
| 2.4 | `/auth/login` | Invalid credentials | Error message; remain on login |
| 2.5 | `/auth/login` | Valid credentials | Redirect to `/drives`; dashboard visible |

---

## 3. First-Time Setup (Admin)

**User:** Admin configuring the system for the first time

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 3.1 | `/settings/general` | Create active season | Season created; marked active |
| 3.2 | `/duties` | Verify duty types | Default duties visible (Provider, Dari, Thaal, etc.) |
| 3.3 | `/drives/new` | Create first drive | Name, date, location, daig count, sunset (auto-fetch); drive created |
| 3.4 | `/volunteers/new` or `/volunteer/register` | Add volunteers | Volunteer(s) added |
| 3.5 | `/drives/[id]/assignments` | Batch auto-assign | Assignments created per drive |

**Prerequisite:** Must complete 3.1 before 3.3 (Create Drive requires active season).

---

## 4. Daily Operations (Admin)

**User:** Admin managing drives and volunteers

### 4A. Drives

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 4A.1 | `/drives` | View drive list | List of drives (or "No active season" if none) |
| 4A.2 | `/drives/new` | Create drive | Form; submit → drive created |
| 4A.3 | `/drives/[id]` | View drive detail | Date, location, status; tabs: Duty Board, Call Center, Live, Reminders |
| 4A.4 | `/drives/[id]/assignments` | Duty Board | Kanban columns; batch assign; drag volunteers |
| 4A.5 | `/drives/[id]/calls` | Call Center | Trigger AI calls (if configured) |
| 4A.6 | `/drives/[id]/live` | Live Dashboard | Real-time roster view |
| 4A.7 | `/drives/[id]/reminders` | Reminders | Reminder schedules |

### 4B. Volunteers

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 4B.1 | `/volunteers` | List volunteers | Table; search, gender filter, pagination |
| 4B.2 | `/volunteers/new` | Add volunteer | Form; submit → volunteer created |
| 4B.3 | `/volunteers/[id]` | Volunteer profile | Profile + assignment history |
| 4B.4 | `/volunteers/import` | Import page | Bulk import (Sheets/CSV) UI |

### 4C. Duties

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 4C.1 | `/duties` | List duties | Duty types |
| 4C.2 | `/duties/[id]/rules` | Duty rules | Capacity rules (linear/tiered) |

### 4D. Analytics & Settings

| Step | Route | Action | Expected |
|------|-------|--------|----------|
| 4D.1 | `/analytics` | Analytics | Charts, metrics |
| 4D.2 | `/settings/*` | Settings | General, Assignment, Calling, Reminders, WhatsApp, Sheets, Alerts |

---

## 5. Edge Cases

| Step | Scenario | Expected |
|------|----------|----------|
| 5.1 | Visit `/drives` without login | Redirect to `/auth/login` |
| 5.2 | Invalid drive ID | 404 or error message |
| 5.3 | Invalid volunteer ID | 404 or error message |

---

## E2E Test Mapping

| Phase | Spec File | Flow Section |
|-------|-----------|--------------|
| Phase 1 | `phase1-public.spec.ts` | §1 Public |
| Phase 2 | `phase2-auth.spec.ts` | §2 Auth |
| Phase 3 | `phase3-dashboard.spec.ts` | §4 Daily Ops (nav) |
| Phase 4 | `phase4-drives.spec.ts` | §4A Drives |
| Phase 5 | `phase5-volunteers.spec.ts` | §4B Volunteers |
| Phase 6 | `phase6-duties.spec.ts` | §4C Duties |
| Phase 7 | `phase7-settings.spec.ts` | §4D Settings |
| Phase 8 | `phase8-edge.spec.ts` | §5 Edge Cases |
| Flow | `flow-admin-journey.spec.ts` | §3 + §4 (single journey) |

---

## Run Order

Tests run in file order. The flow test (`flow-admin-journey.spec.ts`) can run last and assumes:

- Test user exists (E2E_TEST_EMAIL, E2E_TEST_PASSWORD)
- Active season may or may not exist; flow test creates one if needed or skips create-drive when none
