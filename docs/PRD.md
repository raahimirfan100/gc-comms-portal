# PRD: Grand Citizens — Iftaar Drive Volunteer

# Management Dashboard (Non-Technical)

## 1) Purpose

Grand Citizens runs multiple Iftaar Drives during Ramadan. Today, volunteer signups happen
via Google Forms and coordination happens manually (assigning duties, filling quotas,
reminding people, adding them to WhatsApp groups, confirming attendance). This PRD defines
a single, simple dashboard that makes the entire volunteer lifecycle effortless: **collect → sort →
assign → communicate → confirm → show up → learn**.
This product must be **beautiful, fast, obvious** , and **fully configurable** so nothing is hard-coded
(duties, quotas, assignment rules, reminder timings, cities, messages, calling times, etc.).

## 2) Goals (What success looks like)

**Operational goals**
● Reduce volunteer coordination time by **70–90%** per drive.
● Ensure **every drive** hits the needed headcount for each duty (no last-minute gaps).
● Give admins **instant clarity** : who is coming, what they’re doing, and what’s still missing.
**Volunteer experience goals**
● Volunteers get immediate, friendly confirmation and clear duty info.
● Volunteers get reminders at the right moments (configurable), and can confirm/cancel
easily.
● Volunteers feel guided, not spammed.
**Configuration goals**
● Admins can change duties, ratios, caps, priorities, repeat-volunteer rules, reminder
schedules, WhatsApp groups, and calling behavior **without developer help**.

## 3) Non-Goals (Explicitly out of scope for now)

```
● Managing donations, finances, inventory, procurement, vendor payments.
● Advanced HR features (background checks, documents).
● Complex WhatsApp “chatbot” behavior (we’ll keep replies very simple).
```

## 4) Primary Users & Permissions

**A) Super Admin**
● Full access to everything: drives, rules, messaging, calling, templates, analytics,
permissions.
**B) Drive Admin**
● Can create/configure drives, review/override assignments, send communications, track
attendance.
**C) Duty Lead (optional but recommended)**
● Can view roster for their duty, see who confirmed, mark attendance, request
replacements.
**D) Viewer / Auditor**
● Read-only access (useful for leadership oversight).
Permissions must be clear and visible (no surprises).

## 5) Core Objects (Plain-English data)

**Volunteer**
● Name, phone, email
● School/Company
● Volunteer history (what duties they did in the past)
● Preferences/availability (from the form)
● WhatsApp status (added to group, opted out, etc.)
● Confirmation status for each drive
**Iftaar Drive**
● Date, location, city (for sunset-based timing)
● Number of daigs / expected people served / seated count
● Duties needed + required counts + caps (all configurable)
● Assigned roster + backups
**Duty**


```
● A duty name (e.g., Provider, Dari, Traffic, Daig, Thaal, Sherbet, Female Provider, Female
Dari, etc.)
● Rules for who should be assigned and in what priority
● Required count and optional cap
```
## 6) Intake: Google Form Connection (Must-have)

Volunteers sign up using a Google Form with fields like:
● Timestamp
● Email
● Full Name
● Phone Number
● School / College / University / Company
● Days available
● Agreement checkbox (“I agree to volunteer...”)
**Requirements**
● The dashboard must **automatically pull new signups** from the Google Form.
● Admins can map form questions to dashboard fields (in case the form changes wording).
● Duplicate handling:
○ Same phone/email → flagged as “Possible duplicate”
○ Admin can merge duplicates with 1 click.
● If the form changes (new question, renamed question), the dashboard should **alert**
admins and ask them to remap.
**Volunteer-friendly requirement**
● Immediately after signup, the volunteer gets a confirmation message (template-based,
configurable).

## 7) Drive Setup (Creating & configuring each Iftaar Drive)

Admins must be able to create a drive with:
● Drive name (e.g., “Drive 3 – University Road”)
● Date
● Location details (pin/address + notes)
● City (for sunset timing)
● Number of daigs ordered (and/or expected people served/seated)


**Duty planning**
For each drive, admins set:
● List of duties to use (choose from a library; can add new duties any time)
● Required headcount per duty
● Optional caps per duty
● How those numbers are calculated:
○ Example: “Provider = 1 per X seated”
○ Example: “Thaal = fixed number”
○ Example: “Traffic = 2 minimum, cap at 4”
● The key requirement: **admins can define the logic in human terms** , and also override
with fixed numbers anytime.
**Drive templates**
● Admins can create “Drive Templates” (e.g., “Small Drive”, “Medium Drive”, “Large Drive”)
that pre-fill duties and ratios.
● Each drive can still be customized.

## 8) Assignment Engine (Auto-assign duties — fully configurable)

The system will auto-assign duties for each volunteer signup for a specific drive. Admins must
be able to control the rules, priorities, and exceptions.
**8.1 Repeat Volunteer Logic (Configurable)**
If a volunteer has done duties before:
● Find their most frequently performed duty (“most common duty”).
● Try to assign them to it **if space is available**.
● If full, try their 2nd most common duty, then 3rd, and so on.
● If all their historical duties are full, treat them as “first-time” for assignment purposes.
Admin settings must include:
● What counts as “repeat volunteer” (e.g., volunteered within last 12 months vs ever)
● How “most frequent” is calculated (all-time vs last N drives)
● Whether admins want to prefer “variety” (optional setting to rotate volunteers)
Admins must be able to:
● Edit these priority orders anytime
● Add/remove duties from each list
● Decide whether gender-based routing is used at all (on/off toggle)


● Decide what happens when all priority duties are full (spillover list)
**8.3 Capacity & Fairness Rules (Configurable)**
Admins can configure:
● Minimum required per duty
● Optional caps
● Spillover behavior when a duty is full:
○ “Move to next duty”
○ “Put on standby”
○ “Mark as needs manual review”
● Balance rules:
○ Avoid putting too many first-timers into one critical duty (optional)
○ Reserve some spots for repeat volunteers (optional)
**8.4 Manual Overrides (Must-have)**
Even with auto assignment, admins must be able to:
● Drag-and-drop volunteers between duties
● Lock a volunteer to a duty (“Do not change”)
● Lock a duty’s roster (“Do not auto-change further”)
● Add a volunteer manually (walk-in / special case)
● Mark someone as standby
Every override should show a small note:
● “Changed by Admin A at 6:41pm”

## 9) Messaging & WhatsApp (Must-have)

**9.1 Immediate WhatsApp Group Add**
Right after signup, the system should:
● Add the volunteer to a **configurable WhatsApp group** (per drive or global, admin
choice)
● Send a welcome message (template-based)
Important: This must be designed with consent in mind:
● The signup form should include a clear consent checkbox like:
○ “I agree to be added to a WhatsApp group for coordination.”


Admins can configure:
● Which group to add for each drive
● Whether to add immediately or only after assignment review
● Welcome message template
**9.2 Reminder Messages (X times, at configurable times)**
Admins must be able to set reminder schedules such as:
● Immediately after assignment
● 24 hours before
● Morning of the drive
● 2 hours before
● 30 minutes before
Each reminder:
● Uses a message template
● Can include dynamic details:
○ Drive date/time/location
○ Assigned duty
○ Meeting point
○ What to bring / dress code
○ Contact number
**9.3 Simple Reply Handling (Keep it “stupid simple”)**
Volunteers can reply with simple keywords:
● **CONFIRM** → marks confirmed
● **CANCEL** → marks canceled and triggers replacement flow
● **HELP** → sends a preset message + notifies admin
Anything else:
● Auto-reply: “Please reply CONFIRM, CANCEL, or HELP”
● Flag for admin review (optional)

## 10) AI Calling at a Sunset-Based Time (Must-have)

At a configurable time based on sunset in a configurable city, the system will call every signup.
**Admin configuration**


● City used for sunset timing (per drive)
● When to call relative to sunset:
○ Example: “Call at sunset - 60 minutes” or “sunset + 30 minutes”
● Call audience:
○ All signups
○ Only unconfirmed
○ Only standby
● Retry rules:
○ Call once or multiple times
○ Stop if confirmed
**Call outcome tracking**
Each call logs a simple outcome:
● Reached & confirmed
● Reached & canceled
● No answer
● Wrong number
● Asked for help
**Volunteer experience**
● Call script is short, polite, and purpose-driven.
● Includes an opt-out line: “To stop calls/messages, reply STOP.”

## 11) Admin Dashboard: UX / UI Requirements (Absolute best)

The dashboard should feel like “mission control” but not overwhelming.
**11.1 Home Overview**
A clean, visual overview:
● Upcoming drives (cards)
● For each drive:
○ Total signups
○ Confirmed / Unconfirmed / Canceled
○ Duty coverage bars (green = filled, yellow = low, red = missing)
○ “Needs attention” alerts
**11.2 Drive Detail Page (The main working screen)**
Sections:


1. **Drive Summary Strip**
    ○ Date, location, expected people, daigs
    ○ Sunset time and scheduled calling time (clearly shown)
2. **Duty Coverage Board (Visual and interactive)**
    ○ Each duty is a column with:
       ■ Required count / assigned / cap
       ■ People chips (with icons for confirmed/unconfirmed)
    ○ Drag-and-drop volunteers between duties
    ○ Instant feedback:
       ■ If you exceed cap → warning shake + “Over cap”
       ■ If duty underfilled → red badge
3. **Volunteer List (Searchable)**
    ○ Search by name/phone
    ○ Filters: confirmed, unconfirmed, canceled, standby, first-time, repeat
    ○ One-click actions: message, move, mark confirmed, mark canceled
4. **Communications Panel**
    ○ Upcoming scheduled reminders (editable)
    ○ “Send message now” with template selection
    ○ WhatsApp group status (who failed to add, etc.)
    ○ Calling schedule status
**11.3 Visual Feedback Rules (Non-negotiable)**
● Every critical action confirms visually:
○ “Saved ✓”
○ “Message sent ✓”
○ “3 volunteers moved”
● Coverage is always obvious:
○ Green = good
○ Yellow = watch
○ Red = problem
● Empty duties look “hungry” (clear missing count)
● A single “Problems” drawer:
○ duplicates
○ missing phone numbers
○ failed WhatsApp adds
○ underfilled duties
○ unconfirmed volunteers near deadline

## 12) Replacement & Standby Flow (Must-have)

When someone cancels:


● System immediately identifies the best standby candidate (based on the same
assignment rules)
● Admin can approve with 1 click
● Sends the standby person a message:
○ “A spot opened up for Drive X — reply CONFIRM to accept.”
Admins can configure:
● Whether replacements are automatic or require approval
● How standby is prioritized (repeat volunteers first, etc.)

## 13) Reporting (Simple, useful)

Per drive:
● Final roster by duty (exportable)
● Attendance/confirmation stats
● Most common cancellation window (helps planning)
● Duty fulfillment performance
Across Ramadan:
● Volunteer leaderboard (optional)
● Retention (repeat volunteers)
● Duty distribution (are we overusing the same people?)

## 14) Key Templates (Editable, per drive or global)

```
● Signup confirmation
● Added to WhatsApp group welcome
● Duty assignment message
● Reminder messages (multiple)
● Location/map message
● AI call script text
● Help response
● Cancellation acknowledgement
● Standby invitation
```
## 15) Safety, Consent, and Privacy (Must-have)


```
● Signup form should include clear consent for:
○ WhatsApp group add
○ WhatsApp reminders
○ AI calling
● Volunteers must be able to opt out:
○ Reply STOP → admin-configurable behavior (stop messages, stop calls, or both)
● Access control:
○ Only approved admins can view full phone lists
● Audit log:
○ Who changed assignments, who sent messages, who triggered calling
```
## 16) Edge Cases (Must handle gracefully)

```
● Volunteer signs up with missing phone → flagged as incomplete, cannot message/call
until fixed
● Same person signs up multiple times → dedupe suggestion
● Volunteer picks multiple days → system asks admin to either:
○ assign them to specific drives automatically, or
○ keep them in a pool for manual selection
● Drive capacity changes late (more daigs added) → one-click “recalculate needs” and “fill
from pool/standby”
● WhatsApp group add fails → retry and show “Needs attention”
● Volunteer replies with random text → gentle prompt + admin flag
```
## 17) MVP Scope (What must be in the first release)

1. Google Form connection + mapping + dedupe
2. Drive creation + templates
3. Duty definitions + configurable required/cap logic (at least via editable numbers + rule
    presets)
4. Auto assignment rules:
    ○ repeat volunteer logic
    ○ first-time logic with gender-based priority lists
    ○ spillover + standby
5. Manual override (drag-and-drop, lock)
6. WhatsApp:
    ○ group add
    ○ scheduled reminders
    ○ simple replies (CONFIRM/CANCEL/HELP)
7. Sunset-based AI calling with outcomes
8. Clean dashboards + exports


## 18) Future Enhancements (Nice-to-have, not required day one)

```
● On-site check-in mode (QR or quick search)
● Duty lead mini-dashboard
● Volunteer rating/notes (“great at traffic”)
● Multi-language templates (Urdu/English toggle)
● Automated “thank you” + next-drive recruitment
```
## 19) Acceptance Criteria (How we know it’s done)

```
● Admin can set up a new drive in under 5 minutes using a template.
● Duty board shows coverage clearly and updates instantly after changes.
● Auto assignment produces a usable roster with minimal manual edits.
● Messages and calling run on schedule with visible status and logs.
● Volunteers can confirm/cancel with one-word replies and the roster updates correctly.
● Every major setting (duties, priorities, caps, schedules, city, group) is configurable in the
UI.
```

