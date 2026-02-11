# Volunteer Registration Manual Test Script

Run these scenarios in a browser at http://localhost:3000/volunteer/register. The dev server must be running, and the auto-assign integration script should have created the test data (drives, volunteers).

---

## Scenario A – Returning male volunteer + waitlist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to http://localhost:3000/volunteer/register | Step 1: Phone input form |
| 2 | In phone input, type **03001111111** | - |
| 3 | Click **Continue** | Step 2 |
| 4 | Verify name prefilled as **Test Male FirstTimer**, gender **Male** | Prefill correct |
| 5 | Click **Next** | Step 3: Drives list |
| 6 | Ensure **AutoAssign Test – First Timers** is checked; also check **AutoAssign Test – Waitlist** | Both drives selected |
| 7 | Check agreement checkbox | - |
| 8 | Click **Sign Up as Volunteer** | Success screen |
| 9 | Record **Your Duty Assignments** text | Should include "AutoAssign Test – Waitlist: Waitlisted (Provider)" |

**Notes:** Phone 03001111111 → volunteer "Test Male FirstTimer" (from `+923001111111`). First Timers drive gets normal assignment; Waitlist drive has all duties at capacity 0, so volunteer is waitlisted.

---

## Scenario B – New female first-time volunteer, normal assignment

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to http://localhost:3000/volunteer/register (or Reset/Back to start) | Step 1 |
| 2 | Clear phone, type **03001111116** | New volunteer (no existing record) |
| 3 | Click **Continue** | Step 2: Empty fields |
| 4 | Name: **Manual Female FirstTimer**; Gender: **Female**; Email/Org blank | - |
| 5 | Click **Next** | Step 3 |
| 6 | Check **AutoAssign Test – First Timers** only; uncheck others | - |
| 7 | Check agreement, click **Sign Up as Volunteer** | Success |
| 8 | Record **Your Duty Assignments** | Should show "AutoAssign Test – First Timers: Thaal" (female-priority duty) |

**Notes:** 03001111116 is a new phone. Female first-timer should get Thaal for First Timers drive.

---

## Scenario C – Returning male with preferred duty full (falls back to Dari)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Navigate to http://localhost:3000/volunteer/register | Step 1 |
| 2 | Phone: **03001111113** | Volunteer "Test Male Returning" |
| 3 | Click **Continue** | Step 2 |
| 4 | Verify name **Test Male Returning**, gender **Male** | Prefill correct |
| 5 | Click **Next** | Step 3 |
| 6 | Select **AutoAssign Test – Returning Duty Full** only (scroll if needed) | Uncheck other drives |
| 7 | Check agreement, click **Sign Up as Volunteer** | Success |
| 8 | Record **Your Duty Assignments** | Should show "AutoAssign Test – Returning Duty Full: Dari" (Provider capacity = 0) |

**Notes:** Phone 03001111113 → "Test Male Returning". Provider duty has capacity 0; algorithm should fall back to Dari.

---

## Log Template

Fill this after each scenario:

### Scenario A
- **Inputs:** Phone 03001111111
- **Elements clicked:** Continue, Next, agreement checkbox, Sign Up as Volunteer
- **Your Duty Assignments:**
```
(paste here)
```
- **Anomalies:** (none / describe)

### Scenario B
- **Inputs:** Phone 03001111116; Name Manual Female FirstTimer; Gender Female
- **Elements clicked:** Continue, Next, agreement checkbox, Sign Up as Volunteer
- **Your Duty Assignments:**
```
(paste here)
```
- **Anomalies:** (none / describe)

### Scenario C
- **Inputs:** Phone 03001111113
- **Elements clicked:** Continue, Next, agreement checkbox, Sign Up as Volunteer
- **Your Duty Assignments:**
```
(paste here)
```
- **Anomalies:** (none / describe)

---

## Prerequisites

1. **Dev server:** `npm run dev` at http://localhost:3000
2. **Test data:** Run the auto-assign integration script to create volunteers and drives:
   ```bash
   npx tsx tests/auto-assign.integration.ts
   ```
3. **Waitlist drive:** If "AutoAssign Test – Waitlist" isn't visible, run:
   ```bash
   npx tsx tests/prepare-waitlist-drive.ts
   ```
