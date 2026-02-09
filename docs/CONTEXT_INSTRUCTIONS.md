# Instructions: Maintaining `docs/context.md`

## Purpose

**Every AI chat that works on this project must use and update `docs/context.md`.** This file is the single source of truth for:

- Where the project is (current state)
- What has happened (decisions, major changes)
- Issues found and how they were fixed
- What you (the user) suggested
- What to do next and a brief idea of how to do it

This way, each new chat can start with one file and get up to speed quickly.

---

## Instructions for the AI

### 1. At the start of a task

1. **Read `docs/context.md`** (create it if it doesn’t exist using the template below).
2. **Read the specific task** from `docs/REMAINING_FEATURES_AND_TASKS.md` that you were asked to do.
3. Use context to avoid redoing work, repeating fixes, or conflicting with recent decisions.

### 2. After completing a task (or after a meaningful step)

**Update `docs/context.md`** with:

| Section | What to add |
|--------|-------------|
| **Last updated** | Date (and optionally task ID or one-line summary). |
| **Current state** | What’s done and what’s in progress (e.g. “Drive list and create work; assignment board has dnd-kit; Sheets mapping not started”). |
| **What happened** | Short note: “Task X.Y.Z completed: [brief description]. Files changed: [list].” |
| **Issues found & fixes** | Any bug, error, or unexpected behavior and the fix (e.g. “Sunset time was null because date format was wrong → fixed in fetchSunsetTime to use YYYY-MM-DD”). |
| **User suggestions** | Anything the user asked for that isn’t in the PRD/task list (e.g. “User wants export as XLSX, not only CSV”). |
| **What to do next** | The next recommended task (by ID from REMAINING_FEATURES_AND_TASKS.md) and a **brief** idea of how (e.g. “1.1.1: Add `drive_templates` table in supabase/full_schema.sql; add migration or document for existing deployments.”). |

### 3. Keep it concise

- Prefer short bullets and one-line explanations.
- No long prose; this is a handover document for the next chat.

### 4. If `context.md` is missing

Create `docs/context.md` using the **Template** below, then fill in what you know from the codebase and conversation.

---

## Template for `docs/context.md`

```markdown
# Project context — Grand Citizens Iftaar Drive Portal

**Last updated:** YYYY-MM-DD [optional: Task ID or one-line summary]

## Current state

- **Done:** …
- **In progress / partial:** …
- **Not started:** …

## What happened (recent)

- …

## Issues found and how they were fixed

- …

## User suggestions

- …

## What to do next

- **Next task:** [e.g. Task 1.1.1 from REMAINING_FEATURES_AND_TASKS.md]
- **Brief idea:** …
```

---

## Where things live

| Document | Purpose |
|----------|--------|
| `docs/context.md` | Living handover: where we are, what happened, issues/fixes, your suggestions, next step. **Update this every time you complete a task or fix an issue.** |
| `docs/REMAINING_FEATURES_AND_TASKS.md` | Full list of remaining features and tasks with “how to accomplish” detail. Tasks are given to chats one by one. |
| `docs/PRD.md` | Product requirements (non-technical). |
| `docs/DEVELOPER_GUIDE.md` | Architecture, schema, routing, patterns, troubleshooting. |
| `README.md` | Overview, tech stack, getting started, env vars. |
| `docs/testing/README.md` | Comprehensive testing instructions for the AI; use browser + all tools, record in TEST_LOG. |
| `docs/testing/E2E_SCENARIOS.md` | Step-by-step E2E scenarios to execute. |
| `docs/testing/TEST_LOG.md` | Living log: functionality tested, how, result, abnormalities (AI updates this). |
