# Browser Test Report - Volunteer Registration

Generated: 2026-02-11T19:15:50.106Z

## Scenario A: Returning Male + Waitlist

**Status:** ❌ FAILED

### Steps:

1. **Navigate to /volunteer/register**
   - Result: Page loaded
1. **Enter phone: 03001111111**
   - Result: Phone entered
1. **Click Continue**
   - Result: Navigated to Step 2
1. **Verify name prefill**
   - Result: Name value: [return value] Test Male FirstTimer
1. **Click Next**
   - Result: Navigated to Step 3
1. **Check 'AutoAssign Test – Waitlist' drive**
   - Result: Checking...
---

## Scenario B: New Female First-Timer

**Status:** ❌ FAILED

### Steps:

1. **Navigate to /volunteer/register**
   - Result: Page loaded
1. **Enter phone: 03001111116**
   - Result: Phone entered
1. **Click Continue**
   - Result: Navigated to Step 2 (no prefill expected)
1. **Fill name: Manual Female FirstTimer**
   - Result: Name filled
1. **Select gender: Female**
   - Result: Gender selected
1. **Click Next**
   - Result: Navigated to Step 3
1. **Check 'AutoAssign Test – First Timers' drive**
   - Result: Checking...
---

## Scenario C: Returning Male, Preferred Duty Full

**Status:** ❌ FAILED

### Steps:

1. **Navigate to /volunteer/register**
   - Result: Page loaded
1. **Enter phone: 03001111113**
   - Result: Phone entered
1. **Click Continue**
   - Result: Navigated to Step 2
1. **Verify name prefill**
   - Result: Name: [return value] Test Male Returning
1. **Click Next**
   - Result: Navigated to Step 3
1. **Check 'AutoAssign Test – Returning Duty Full' drive**
   - Result: Checking...
---

## Summary

**Passed:** 0/3

