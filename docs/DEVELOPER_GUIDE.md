# Grand Citizens — Iftaar Drive Management

## Developer Guide

![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Domain Glossary](#2-domain-glossary)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [Routing Map](#7-routing-map)
8. [Auto-Assignment Algorithm](#8-auto-assignment-algorithm)
9. [Capacity Calculation](#9-capacity-calculation)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [Railway Service](#11-railway-service)
12. [Getting Started](#12-getting-started)
13. [Environment Variables Guide](#13-environment-variables-guide)
14. [Supabase Client Patterns](#14-supabase-client-patterns)
15. [Code Patterns & Conventions](#15-code-patterns--conventions)
16. [App Config Reference](#16-app-config-reference)
17. [Common Tasks Guide](#17-common-tasks-guide)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Overview

**Grand Citizens** is a charitable organization in Karachi, Pakistan that runs large-scale iftaar (the meal Muslims eat at sunset to break their Ramadan fast) feeding drives during the holy month of Ramadan. Each drive serves hundreds of people on the streets and requires coordinating dozens of volunteers across multiple duty stations — cooking, serving, traffic management, and more. The scale and pace of operations (drives happen daily at sunset for 30 consecutive days) demand software to replace the spreadsheets, WhatsApp groups, and phone trees that previously held everything together.

This platform is the operational nerve center for those drives. It manages the full lifecycle: creating drive events with auto-fetched sunset times for Karachi, registering volunteers (via Google Sheets import, public sign-up forms, or manual entry), automatically assigning volunteers to duties based on capacity rules and past history, confirming attendance through AI phone calls (Urdu-language via Retell AI) and WhatsApp messaging (via Baileys), scheduling reminders relative to sunset, and monitoring volunteer arrivals in real time on drive day with a live dashboard. Everything is scoped by Ramadan season (identified by Islamic Hijri year), so historical data from previous years is preserved and accessible.

---

## 2. Domain Glossary

A new developer will encounter Pakistan-specific and organization-specific terminology throughout the codebase. This table is essential.

| Term | Definition |
|------|-----------|
| **Iftaar** | The meal eaten at sunset to break the Ramadan fast. Grand Citizens serves iftaar to the public on the streets. |
| **Drive** | A single iftaar event on a specific date and location. One drive = one evening's feeding operation. Drives have statuses: `draft` → `open` → `in_progress` → `completed` (or `cancelled`). |
| **Season** | A Ramadan season, spanning roughly 30 days. All data is scoped by season. Each season is identified by its Hijri (Islamic calendar) year. |
| **Daig** | A massive cooking pot (literally, a cauldron) used to prepare food in bulk. The number of daigs determines the scale of a drive — more daigs means more food, which means more volunteers are needed. Daig count is the primary input to capacity calculations. |
| **Duty** | A specific role/task at a drive. Examples: Provider (serving food), Dari (floor mat setup), Thaal (serving trays), Traffic (road management), Sherbet (drinks), Daig (cooking). Each duty has a slug (e.g., `provider`, `dari`, `thaal`). |
| **Provider** | The duty of serving food directly to people sitting on the street. Often the highest-priority assignment for male volunteers. |
| **Dari** | Floor mats laid on the road for people to sit and eat. The duty involves carrying, laying out, and collecting daris. |
| **Thaal** | Large serving trays/plates. The duty involves distributing and collecting thaals. Often the highest-priority assignment for female volunteers. |
| **Traffic** | Traffic control duty — volunteers manage road closures and vehicle flow around the drive location. Male-only duty in practice. |
| **Sherbet** | A sweet drink served alongside the meal. The duty involves preparation and distribution. |
| **Assignment** | The mapping of one volunteer to one duty for one drive. Has a status lifecycle: `assigned` → `confirmed` → `en_route` → `arrived` → `completed` (or `cancelled` / `no_show` / `waitlisted`). |
| **Capacity** | The maximum number of volunteers a duty can accept for a given drive. Calculated from daig count via linear or tiered formulas, or manually overridden. |
| **Waitlist** | When all duties for a drive are at capacity, new volunteers are added to a waitlist with a position number. They are automatically promoted when a spot opens (via cancellation or capacity increase). |
| **Sunset Time** | The exact time of sunset for the drive date in Karachi. Fetched from the Aladhan API. Critical because iftaar begins at sunset — all reminders and call schedules are relative to this time. |
| **Hijri Year** | The year in the Islamic lunar calendar. Ramadan falls in a different Gregorian month each year. Seasons are named by Hijri year (e.g., "Ramadan 1447"). |
| **Gender Restriction** | Some duties are restricted to male or female volunteers (e.g., traffic is typically male-only, thaal may be female-priority). The auto-assignment algorithm respects these restrictions. |

---

## 3. Tech Stack

| Technology | Version | Role in This Project |
|---|---|---|
| **Next.js** | 16 (App Router) | Full-stack framework — server components, API routes, server actions, middleware |
| **React** | 19 | UI rendering with Server Components by default, Client Components for interactivity |
| **TypeScript** | 5.x (strict) | Type safety across the entire codebase; generated Supabase types |
| **Supabase** | Latest (`@supabase/supabase-js`, `@supabase/ssr`) | Postgres database, authentication, Row Level Security, Realtime subscriptions |
| **Tailwind CSS** | 3.4 | Utility-first styling with CSS variable-based theming (HSL colors) |
| **shadcn/ui** | New York style | 25+ pre-built UI components (Button, Card, Dialog, Table, Select, etc.) via Radix UI primitives |
| **Radix UI** | Various `@radix-ui/*` | Accessible, unstyled UI primitives underlying shadcn/ui components |
| **Lucide React** | 0.511 | Icon library used throughout the dashboard (CalendarDays, Users, Settings, etc.) |
| **Recharts** | 3.7 | Analytics charts — volunteer attendance trends, drive metrics, leaderboards |
| **dnd-kit** | Core 6.3 / Sortable 10.0 | Drag-and-drop Kanban board for the duty assignment interface |
| **date-fns** | 4.1 | Date formatting and manipulation |
| **react-day-picker** | 9.13 | Calendar date picker component |
| **Sonner** | 2.0 | Toast notification system for success/error feedback |
| **next-themes** | 0.4 | Dark mode / light mode / system theme switching (class strategy on `<html>`) |
| **Geist Sans** | Google Fonts | Primary typeface — clean, modern sans-serif from Vercel |
| **cmdk** | 1.1 | Command palette component (used in shadcn/ui Command component) |
| **class-variance-authority** | 0.7 | Variant management for component styling (used by shadcn/ui) |
| **clsx** + **tailwind-merge** | Latest | Utility for merging Tailwind classes without conflicts (the `cn()` helper) |
| **Express** | 4.21 | Railway background service HTTP server |
| **Baileys** | 6.7 | WhatsApp Web API client (unofficial) for messaging in the Railway service |
| **cron** | 3.5 | Cron job scheduling for the Railway service (reminders, syncs, status transitions) |
| **googleapis** | 144 | Google Sheets API for volunteer import/sync in the Railway service |
| **Retell AI** | REST API | AI-powered phone calls in Urdu for volunteer confirmation |
| **Aladhan API** | REST API | Islamic prayer times API — used to fetch Karachi sunset times for each drive date |
| **ESLint** | 9 | Linting with `next/core-web-vitals` + `next/typescript` configs |
| **PostCSS** + **Autoprefixer** | Standard | CSS processing pipeline for Tailwind |
| **tailwindcss-animate** | 1.0 | Animation utilities for shadcn/ui transitions |

---

## 4. Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
│  │ Public Pages │  │  Auth Pages  │  │  Dashboard (Protected)     │  │
│  │ Landing,     │  │ Login,       │  │  Drives, Volunteers,       │  │
│  │ Volunteer    │  │ Signup,      │  │  Duties, Analytics,        │  │
│  │ Registration │  │ Password     │  │  Settings, Live Monitor    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────────┘  │
└─────────┼─────────────────┼─────────────────────┼────────────────────┘
          │                 │                     │
          ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APP (Vercel / Node)                      │
│                                                                      │
│  ┌───────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Middleware │  │ Server       │  │ Server   │  │ API Routes    │  │
│  │ (proxy.ts) │  │ Components   │  │ Actions  │  │ /api/*        │  │
│  │ Session    │  │ SSR data     │  │ Mutations│  │ Batch assign, │  │
│  │ refresh +  │  │ fetching     │  │ revalidate│ │ Call trigger  │  │
│  │ auth guard │  │              │  │          │  │               │  │
│  └──────┬─────┘  └──────┬───────┘  └────┬─────┘  └──────┬────────┘  │
│         │               │               │               │           │
│         ▼               ▼               ▼               ▼           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Supabase Clients (browser / server / admin)     │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD                                  │
│                                                                      │
│  ┌───────────┐  ┌────────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ Postgres   │  │ Auth       │  │ Realtime  │  │ Row Level    │   │
│  │ 13 tables  │  │ Email/OTP  │  │ WebSocket │  │ Security     │   │
│  │ 7 enums    │  │ JWT claims │  │ assignment│  │ Policies     │   │
│  │ 1 function │  │            │  │ changes   │  │              │   │
│  └────────────┘  └────────────┘  └───────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┤
          ▼                   │
┌──────────────────────┐      │
│  RAILWAY SERVICE     │      │
│  (Express on Railway)│      │
│                      │◄─────┘ (reads/writes via service role)
│  ┌────────────────┐  │
│  │ WhatsApp       │  │ ◄── Baileys WebSocket to WhatsApp servers
│  │ (Baileys)      │  │
│  ├────────────────┤  │
│  │ AI Calling     │  │ ◄── Retell AI REST API
│  │ (Retell)       │  │
│  ├────────────────┤  │
│  │ Google Sheets  │  │ ◄── Google Sheets API v4
│  │ Sync           │  │
│  ├────────────────┤  │
│  │ Cron Scheduler │  │ ── 7 scheduled jobs
│  └────────────────┘  │
└──────────────────────┘

External APIs:
  - Aladhan API  → Sunset times for Karachi (called from Next.js server actions)
  - Retell AI    → Urdu-language phone calls (called from Railway service)
  - WhatsApp     → Messaging via Baileys (persistent connection in Railway)
  - Google Sheets → Volunteer data import (called from Railway service)
```

### Request Flow: Auto-Assign a Volunteer

```
Volunteer submits registration form
         │
         ▼
POST /api/public/auto-assign
         │
         ▼
createAdminClient() ── service role, bypasses RLS
         │
         ▼
autoAssignVolunteer(supabase, volunteerId, driveId)
         │
         ├─── Check: already assigned to this drive? → return null
         │
         ├─── Fetch volunteer gender
         │
         ├─── Fetch drive_duties with capacity info
         │
         ├─── Fetch app_config.assignment_rules
         │
         ├─── Fetch volunteer's assignment history
         │
         ├─── Step 1: Repeat volunteer?
         │    │  Yes → try most-frequent past duty first
         │    │  Has capacity + gender allowed? → INSERT assignment → return
         │    │
         │    ▼
         ├─── Step 2: First-timer (or past duties full)
         │    │  Follow gender-based priority order from config
         │    │  Try each duty: capacity + gender check → INSERT → return
         │    │
         │    ▼
         └─── Step 3: All duties full
              │  Count existing waitlisted volunteers
              │  INSERT assignment with status=waitlisted, position=count+1
              └─── return { status: "waitlisted" }
```

---

## 5. Project Structure

```
next-comms-portal/
├── app/                                    # Next.js App Router
│   ├── layout.tsx                          # Root layout: Geist font, ThemeProvider
│   ├── page.tsx                            # Landing page (public)
│   ├── globals.css                         # Tailwind directives + CSS variables (HSL theme)
│   │
│   ├── (dashboard)/                        # Route group: protected pages with Sidebar+Topbar
│   │   ├── layout.tsx                      # Dashboard shell: Sidebar, Topbar, Toaster
│   │   ├── drives/
│   │   │   ├── page.tsx                    # Drive list (filterable by season)
│   │   │   ├── actions.ts                  # Server actions: createDrive, updateDrive, deleteDrive, fetchSunsetTime
│   │   │   ├── new/
│   │   │   │   └── page.tsx               # Create new drive form
│   │   │   └── [id]/
│   │   │       ├── page.tsx               # Drive detail view
│   │   │       ├── assignments/
│   │   │       │   └── page.tsx           # Kanban duty board (drag-and-drop)
│   │   │       ├── calls/
│   │   │       │   └── page.tsx           # AI calling interface
│   │   │       ├── live/
│   │   │       │   └── page.tsx           # Real-time drive monitoring dashboard
│   │   │       └── reminders/
│   │   │           └── page.tsx           # Reminder schedule management
│   │   ├── volunteers/
│   │   │   ├── page.tsx                    # Volunteer directory (search, filter, pagination)
│   │   │   ├── new/
│   │   │   │   └── page.tsx               # Add volunteer form
│   │   │   ├── import/
│   │   │   │   └── page.tsx               # Bulk import from Google Sheets
│   │   │   └── [id]/
│   │   │       └── page.tsx               # Volunteer profile + assignment history
│   │   ├── duties/
│   │   │   ├── page.tsx                    # Duty type list and configuration
│   │   │   └── [id]/
│   │   │       └── rules/
│   │   │           └── page.tsx           # Capacity rule editor (linear/tiered)
│   │   ├── analytics/
│   │   │   └── page.tsx                    # Charts, metrics, leaderboards (Recharts)
│   │   └── settings/
│   │       ├── general/
│   │       │   └── page.tsx               # Season management, general config
│   │       ├── assignment/
│   │       │   └── page.tsx               # Assignment algorithm rules editor
│   │       ├── calling/
│   │       │   └── page.tsx               # Retell AI configuration
│   │       ├── whatsapp/
│   │       │   └── page.tsx               # WhatsApp connection, QR code, keyword config
│   │       ├── sheets/
│   │       │   └── page.tsx               # Google Sheets sync configuration
│   │       ├── reminders/
│   │       │   └── page.tsx               # Default reminder templates and timing
│   │       └── alerts/
│   │           └── page.tsx               # Alert threshold configuration
│   │
│   ├── api/
│   │   ├── assignments/
│   │   │   └── batch/
│   │   │       └── route.ts               # POST: batch auto-assign (session auth)
│   │   ├── calls/
│   │   │   └── trigger/
│   │   │       └── route.ts               # POST: trigger AI calls (session auth → Railway)
│   │   └── public/
│   │       └── auto-assign/
│   │           └── route.ts               # POST: auto-assign from registration (admin client, no auth)
│   │
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx                   # Login form
│   │   ├── sign-up/
│   │   │   └── page.tsx                   # Sign-up form
│   │   ├── sign-up-success/
│   │   │   └── page.tsx                   # Post-signup confirmation
│   │   ├── forgot-password/
│   │   │   └── page.tsx                   # Password reset request
│   │   ├── update-password/
│   │   │   └── page.tsx                   # Password update form (from reset link)
│   │   ├── error/
│   │   │   └── page.tsx                   # Auth error display
│   │   └── confirm/
│   │       └── route.ts                   # GET: email OTP verification callback
│   │
│   ├── volunteer/
│   │   └── register/
│   │       └── page.tsx                   # Public self-registration form
│   │
│   └── protected/
│       ├── layout.tsx                      # Legacy protected layout (navigation bar)
│       └── page.tsx                        # Legacy protected page
│
├── components/
│   ├── dashboard/
│   │   ├── sidebar.tsx                     # Main navigation: Drives, Volunteers, Duties, Analytics, Settings
│   │   └── topbar.tsx                      # Season selector dropdown, theme switcher, logout
│   ├── ui/                                 # shadcn/ui components (25 components)
│   │   ├── alert.tsx                       # Alert/notification boxes
│   │   ├── avatar.tsx                      # User avatar display
│   │   ├── badge.tsx                       # Status/label badges
│   │   ├── button.tsx                      # Primary button (multiple variants)
│   │   ├── calendar.tsx                    # Date picker calendar
│   │   ├── card.tsx                        # Card container
│   │   ├── checkbox.tsx                    # Checkbox input
│   │   ├── command.tsx                     # Command palette / combobox
│   │   ├── dialog.tsx                      # Modal dialog
│   │   ├── dropdown-menu.tsx               # Dropdown menu
│   │   ├── input.tsx                       # Text input field
│   │   ├── label.tsx                       # Form label
│   │   ├── popover.tsx                     # Popover tooltip
│   │   ├── progress.tsx                    # Progress bar
│   │   ├── scroll-area.tsx                 # Scrollable container
│   │   ├── select.tsx                      # Select dropdown
│   │   ├── separator.tsx                   # Divider line
│   │   ├── sheet.tsx                       # Drawer/sheet panel
│   │   ├── skeleton.tsx                    # Loading placeholder
│   │   ├── sonner.tsx                      # Toast notification wrapper
│   │   ├── switch.tsx                      # Toggle switch
│   │   ├── table.tsx                       # Data table
│   │   ├── tabs.tsx                        # Tab navigation
│   │   ├── textarea.tsx                    # Text area input
│   │   └── tooltip.tsx                     # Tooltip help text
│   ├── auth-button.tsx                     # Login/logout button
│   ├── deploy-button.tsx                   # Deploy CTA
│   ├── env-var-warning.tsx                 # Missing env var warning
│   ├── forgot-password-form.tsx            # Password reset form component
│   ├── hero.tsx                            # Hero section
│   ├── login-form.tsx                      # Login form component
│   ├── logout-button.tsx                   # Logout button
│   ├── next-logo.tsx                       # Next.js logo SVG
│   ├── sign-up-form.tsx                    # Registration form component
│   ├── supabase-logo.tsx                   # Supabase logo SVG
│   ├── theme-switcher.tsx                  # Dark/light/system mode toggle
│   └── update-password-form.tsx            # Password update form component
│
├── lib/
│   ├── supabase/
│   │   ├── types.ts                        # Generated Supabase types (13 tables, 7 enums, 1 function)
│   │   ├── client.ts                       # Browser client (createBrowserClient)
│   │   ├── server.ts                       # Server client (async, cookie-based)
│   │   ├── admin.ts                        # Admin client (service role, bypasses RLS)
│   │   └── proxy.ts                        # Middleware: session refresh + auth redirect
│   ├── assignment/
│   │   └── auto-assign.ts                  # Core algorithm: autoAssignVolunteer, batchAutoAssign, promoteWaitlist
│   └── utils.ts                            # Shared utilities: cn, normalizePhone, formatPhone, formatDate, formatTime, getStatusColor
│
├── railway-service/                        # Separate Express service (its own package.json + tsconfig)
│   ├── package.json                        # Dependencies: express, baileys, cron, googleapis
│   ├── tsconfig.json                       # TypeScript config (isolated from Next.js)
│   └── src/
│       ├── index.ts                        # Express server, service initialization, endpoint registration
│       ├── whatsapp/
│       │   └── connection.ts               # WhatsAppManager: connect, sendMessage, addToGroup, autoReconnect
│       ├── calling/
│       │   └── retell-client.ts            # RetellClient: batchCall, handleWebhook
│       ├── sheets/
│       │   └── sync.ts                     # GoogleSheetsSync: syncAll
│       └── cron/
│           └── scheduler.ts                # 7 cron jobs (reminders, sheets sync, AI calls, sunset, waitlist, health, status)
│
├── proxy.ts                                # Next.js middleware entry point → delegates to lib/supabase/proxy.ts
├── package.json                            # Main dependencies
├── tailwind.config.ts                      # Tailwind theme: CSS variable colors, border radius, animate plugin
├── components.json                         # shadcn/ui config: New York style, RSC enabled, Lucide icons
├── tsconfig.json                           # TypeScript config with @/* path alias
├── .env.example                            # Environment variable template
├── CLAUDE.md                               # AI assistant instructions
└── README.md                               # Project overview
```

---

## 6. Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────────────────────────────────────────┐
│   seasons    │       │                      drives                         │
├─────────────┤       ├─────────────────────────────────────────────────────┤
│ id        PK│◄──┐   │ id                PK                                │
│ name        │   │   │ season_id         FK ──────────────────────────────►│
│ start_date  │   │   │ name                                                │
│ end_date    │   │   │ drive_date                                          │
│ hijri_year  │   │   │ daig_count                                          │
│ is_active   │   │   │ location_name                                       │
│ created_at  │   │   │ location_address                                    │
│ updated_at  │   │   │ sunset_time                                         │
└─────────────┘   │   │ sunset_source                                       │
                  │   │ iftaar_time                                         │
                  │   │ status           (drive_status enum)                │
                  │   │ notes                                               │
                  │   │ created_at                                          │
                  │   │ updated_at                                          │
                  │   └───────┬─────────────────────────────────────────────┘
                  │           │
                  │           │ 1:N
                  │           ▼
                  │   ┌──────────────────────────────────────────────────┐
                  │   │                 drive_duties                      │
                  │   ├──────────────────────────────────────────────────┤
                  │   │ id                    PK                         │
                  │   │ drive_id              FK → drives.id             │
                  │   │ duty_id               FK → duties.id             │
                  │   │ capacity_mode         (capacity_mode enum)       │
                  │   │ calculated_capacity                              │
                  │   │ manual_capacity_override                         │
                  │   │ current_assigned                                 │
                  │   │ created_at                                       │
                  │   │ updated_at                                       │
                  │   └──────────────┬───────────────────────────────────┘
                  │                  │
                  │                  │ N:1
                  │                  ▼
┌─────────────────────────────────────────────────────────┐
│                        duties                            │
├─────────────────────────────────────────────────────────┤
│ id                PK                                     │
│ name                                                     │
│ slug              (unique identifier: "provider", "dari")│
│ display_order     (sorting in UI)                        │
│ gender_restriction (gender enum | null)                  │
│ is_active                                                │
│ created_at                                               │
│ updated_at                                               │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  duty_capacity_rules                      │
├─────────────────────────────────────────────────────────┤
│ id                PK                                     │
│ duty_id           FK → duties.id                         │
│ capacity_mode     (capacity_mode enum)                   │
│ base_count        (linear mode: base volunteer count)    │
│ per_daig_count    (linear mode: extra per daig)          │
│ tier_min_daigs    (tiered mode: range start)             │
│ tier_max_daigs    (tiered mode: range end)               │
│ tier_capacity     (tiered mode: fixed capacity)          │
│ created_at                                               │
│ updated_at                                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      volunteers                          │
├─────────────────────────────────────────────────────────┤
│ id                PK                                     │
│ name                                                     │
│ phone             (normalized to +92 format)             │
│ email                                                    │
│ gender            (gender enum)                          │
│ organization                                             │
│ source            (volunteer_source enum)                │
│ is_active                                                │
│ total_drives_attended                                    │
│ whatsapp_jid      (Baileys JID for WhatsApp)            │
│ notes                                                    │
│ created_at                                               │
│ updated_at                                               │
└───────────┬──────────────────────────┬──────────────────┘
            │                          │
            │ 1:N                      │ 1:N
            ▼                          ▼
┌───────────────────────┐  ┌───────────────────────────────┐
│ volunteer_availability │  │        assignments             │
├───────────────────────┤  ├───────────────────────────────┤
│ id            PK      │  │ id              PK             │
│ volunteer_id  FK ─►vol│  │ volunteer_id    FK → volunteers│
│ drive_id      FK ─►drv│  │ drive_id        FK → drives    │
│ source (vol_source)   │  │ duty_id         FK → duties    │
│ signed_up_at          │  │ status          (assignment_status enum) │
│ created_at            │  │ assigned_by                    │
└───────────────────────┘  │ is_manual_override             │
                           │ waitlist_position              │
                           │ confirmed_at                   │
                           │ checked_in_at                  │
                           │ cancelled_at                   │
                           │ cancellation_reason            │
                           │ created_at                     │
                           │ updated_at                     │
                           └───────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   communication_log                       │
├─────────────────────────────────────────────────────────┤
│ id                PK                                     │
│ volunteer_id      FK → volunteers.id                     │
│ drive_id          FK → drives.id (nullable)              │
│ channel           (comm_channel enum)                    │
│ direction         ("inbound" | "outbound")               │
│ content                                                  │
│ sent_at                                                  │
│ delivered_at                                             │
│ response_received_at                                     │
│ error                                                    │
│ call_id           (Retell call ID)                       │
│ call_provider                                            │
│ call_result       (call_result enum)                     │
│ call_duration_seconds                                    │
│ call_transcript   (JSON)                                 │
│ whatsapp_message_id                                      │
│ created_at                                               │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│   reminder_schedules     │  │    whatsapp_sessions     │
├──────────────────────────┤  ├──────────────────────────┤
│ id              PK       │  │ id              PK       │
│ drive_id        FK→drives│  │ phone_number             │
│ reminder_type            │  │ status                   │
│ hours_before_sunset      │  │ qr_code                  │
│ message_template         │  │ season_group_jid         │
│ scheduled_at             │  │ created_at               │
│ is_sent                  │  │ updated_at               │
│ sent_at                  │  └──────────────────────────┘
│ created_at               │
│ updated_at               │  ┌──────────────────────────┐
└──────────────────────────┘  │   google_sheets_sync     │
                              ├──────────────────────────┤
┌──────────────────────────┐  │ id              PK       │
│      app_config          │  │ sheet_id                 │
├──────────────────────────┤  │ sheet_name               │
│ key             PK       │  │ last_synced_at           │
│ value           (JSON)   │  │ last_synced_row          │
│ description              │  │ sync_errors    (JSON)    │
│ created_at               │  │ created_at               │
│ updated_at               │  │ updated_at               │
└──────────────────────────┘  └──────────────────────────┘
```

### Enums

| Enum | Values | Description |
|------|--------|-------------|
| `drive_status` | `draft`, `open`, `in_progress`, `completed`, `cancelled` | Drive lifecycle. Transitions: draft → open (ready for volunteers) → in_progress (drive day, auto-transitioned by cron) → completed (next day, auto-transitioned). |
| `assignment_status` | `assigned`, `confirmed`, `en_route`, `arrived`, `completed`, `cancelled`, `no_show`, `waitlisted` | Volunteer assignment lifecycle. `assigned` = auto-assigned but not confirmed. `waitlisted` = all duties at capacity. |
| `capacity_mode` | `linear`, `tiered` | How duty capacity is calculated from daig count. Linear uses a formula; tiered uses range-based lookup. |
| `comm_channel` | `whatsapp`, `ai_call`, `manual` | Communication channel for logging in `communication_log`. |
| `call_result` | `confirmed`, `en_route`, `delayed`, `not_coming`, `no_answer`, `voicemail`, `failed` | Outcome of an AI phone call attempt. |
| `gender` | `male`, `female` | Used for volunteer profiles and duty gender restrictions. |
| `volunteer_source` | `google_form`, `in_app_form`, `manual`, `bulk_import` | How the volunteer was added to the system. |

### Database Function

**`calculate_duty_capacity(p_daig_count, p_duty_id, p_mode)`**

Calculates the volunteer capacity for a duty given a daig count. Used during drive creation and updates.

- **Linear mode**: `base_count + CEIL(per_daig_count * p_daig_count)`
- **Tiered mode**: Lookup the `duty_capacity_rules` row where `tier_min_daigs <= p_daig_count <= tier_max_daigs`, return `tier_capacity`

### Triggers

- **`update_drive_duty_assigned_count`** — Fires after INSERT/UPDATE/DELETE on `assignments`. Recalculates `drive_duties.current_assigned` count for the affected drive+duty combination.
- **`moddatetime` triggers** — On most tables, automatically updates the `updated_at` timestamp on row modification (via the `moddatetime` extension).

### Schema source

The schema is defined in **`supabase/full_schema.sql`**. Apply it in the Supabase dashboard (SQL Editor) or via the Supabase CLI. It includes extensions, enums, tables, functions, triggers, RLS policies, Realtime, and seed data (default duties, capacity rules, app_config).

---

## 7. Routing Map

### Page Routes

| URL | Purpose | File Path | Auth |
|-----|---------|-----------|------|
| `/` | Landing page | `app/page.tsx` | Public |
| `/auth/login` | Login form | `app/auth/login/page.tsx` | Public |
| `/auth/sign-up` | Sign-up form | `app/auth/sign-up/page.tsx` | Public |
| `/auth/sign-up-success` | Post-signup confirmation | `app/auth/sign-up-success/page.tsx` | Public |
| `/auth/forgot-password` | Password reset request | `app/auth/forgot-password/page.tsx` | Public |
| `/auth/update-password` | Set new password (from reset link) | `app/auth/update-password/page.tsx` | Public |
| `/auth/error` | Auth error display | `app/auth/error/page.tsx` | Public |
| `/volunteer/register` | Public volunteer self-registration | `app/volunteer/register/page.tsx` | Public |
| `/drives` | Drive list (filterable by season) | `app/(dashboard)/drives/page.tsx` | Protected |
| `/drives/new` | Create new drive form | `app/(dashboard)/drives/new/page.tsx` | Protected |
| `/drives/[id]` | Drive detail view | `app/(dashboard)/drives/[id]/page.tsx` | Protected |
| `/drives/[id]/assignments` | Kanban duty board (drag-and-drop) | `app/(dashboard)/drives/[id]/assignments/page.tsx` | Protected |
| `/drives/[id]/calls` | AI calling interface | `app/(dashboard)/drives/[id]/calls/page.tsx` | Protected |
| `/drives/[id]/live` | Real-time drive monitoring | `app/(dashboard)/drives/[id]/live/page.tsx` | Protected |
| `/drives/[id]/reminders` | Reminder schedule management | `app/(dashboard)/drives/[id]/reminders/page.tsx` | Protected |
| `/volunteers` | Volunteer directory (search, filter) | `app/(dashboard)/volunteers/page.tsx` | Protected |
| `/volunteers/new` | Add volunteer form | `app/(dashboard)/volunteers/new/page.tsx` | Protected |
| `/volunteers/import` | Bulk import from Google Sheets | `app/(dashboard)/volunteers/import/page.tsx` | Protected |
| `/volunteers/[id]` | Volunteer profile + history | `app/(dashboard)/volunteers/[id]/page.tsx` | Protected |
| `/duties` | Duty type list and config | `app/(dashboard)/duties/page.tsx` | Protected |
| `/duties/[id]/rules` | Capacity rule editor | `app/(dashboard)/duties/[id]/rules/page.tsx` | Protected |
| `/analytics` | Charts, metrics, leaderboards | `app/(dashboard)/analytics/page.tsx` | Protected |
| `/settings/general` | Season management, general config | `app/(dashboard)/settings/general/page.tsx` | Protected |
| `/settings/assignment` | Assignment algorithm rules | `app/(dashboard)/settings/assignment/page.tsx` | Protected |
| `/settings/calling` | Retell AI configuration | `app/(dashboard)/settings/calling/page.tsx` | Protected |
| `/settings/whatsapp` | WhatsApp connection + keywords | `app/(dashboard)/settings/whatsapp/page.tsx` | Protected |
| `/settings/sheets` | Google Sheets sync config | `app/(dashboard)/settings/sheets/page.tsx` | Protected |
| `/settings/reminders` | Default reminder templates | `app/(dashboard)/settings/reminders/page.tsx` | Protected |
| `/settings/alerts` | Alert threshold config | `app/(dashboard)/settings/alerts/page.tsx` | Protected |
| `/protected` | Legacy protected page (from template) | `app/protected/page.tsx` | Protected |

### API Routes

| Method | URL | Purpose | Auth Type |
|--------|-----|---------|-----------|
| GET | `/auth/confirm` | Email OTP verification callback | Public (token hash in query) |
| POST | `/api/public/auto-assign` | Auto-assign volunteer after registration | Public (uses admin client internally) |
| POST | `/api/assignments/batch` | Batch auto-assign all available volunteers | Session (Supabase JWT claims) |
| POST | `/api/calls/trigger` | Trigger AI calls for selected volunteers | Session (Supabase JWT claims) |

---

## 8. Auto-Assignment Algorithm

The auto-assignment logic lives in `lib/assignment/auto-assign.ts` and exports three functions.

### `autoAssignVolunteer(supabase, volunteerId, driveId, assignedBy?)`

Assigns a single volunteer to the best available duty for a drive. Returns an `AssignmentResult` or `null`.

**Step-by-step logic:**

```
1. GUARD: Check if volunteer already has an assignment for this drive
   → If yes, return null (no duplicate assignments)

2. FETCH volunteer record (need gender for restriction checks)
   → If not found, return null

3. FETCH all drive_duties for this drive, joined with duties table
   → If no drive_duties exist, return null (drive not set up)

4. FETCH app_config where key = "assignment_rules"
   → Get priority orders, history lookback setting

5. FETCH volunteer's past assignments (excluding cancelled/no_show/waitlisted)
   → Build frequency map: { duty_id → count }

6. STEP 1 — REPEAT VOLUNTEER PATH:
   If the volunteer has past assignments:
   a. Sort past duties by frequency (most common first)
   b. For each past duty (in frequency order):
      - Find the matching drive_duty for this drive
      - Check gender restriction: duty allows this volunteer's gender?
      - Check capacity: (manual_override ?? calculated_capacity) > current_assigned?
      - If both pass → INSERT assignment with status="assigned" → return result
   c. If no past duty has capacity, fall through to Step 2

7. STEP 2 — FIRST-TIMER PATH (or all past duties full):
   a. Select priority order based on volunteer gender:
      - Male:   ["provider", "dari", "traffic", "daig", "thaal", "sherbet"]
      - Female: ["thaal", "female-provider", "female-dari", "provider", "dari", "sherbet"]
      (Configurable via app_config.assignment_rules)
   b. For each duty slug in priority order:
      - Find the matching drive_duty by slug
      - Check gender restriction + capacity (same as Step 1)
      - If both pass → INSERT assignment with status="assigned" → return result
   c. If all duties full, fall through to Step 3

8. STEP 3 — WAITLIST:
   a. Count existing waitlisted assignments for this drive
   b. Find first gender-allowed duty (for the waitlist record)
   c. INSERT assignment with status="waitlisted", waitlist_position=(count + 1)
   d. Return result with status="waitlisted"
```

**Capacity check formula:**

```
effectiveCapacity = manual_capacity_override ?? calculated_capacity
hasRoom = current_assigned < effectiveCapacity
```

**Gender restriction check:**

```
If duty has no gender_restriction (null) → allowed for everyone
If duty.gender_restriction === volunteer.gender → allowed
Otherwise → blocked
```

### `batchAutoAssign(supabase, driveId, assignedBy?)`

Assigns all available (signed-up) volunteers who don't yet have an assignment for the drive.

1. Fetch all `volunteer_availability` records for the drive
2. Fetch all existing `assignments` for the drive
3. Filter to unassigned volunteers
4. Call `autoAssignVolunteer()` sequentially for each
5. Return array of results

### `promoteWaitlist(supabase, driveId)`

Promotes waitlisted volunteers when capacity opens up.

1. Fetch all waitlisted assignments for the drive, ordered by `waitlist_position`
2. For each waitlisted entry:
   a. Delete the waitlist entry
   b. Re-run `autoAssignVolunteer()` for that volunteer
   c. If assigned (not re-waitlisted), add to results
3. Return array of promoted assignments

---

## 9. Capacity Calculation

Duty capacity determines how many volunteers can be assigned to each duty for a drive. The daig count is the driving input.

### Linear Mode

```
capacity = base_count + CEIL(per_daig_count * daig_count)
```

Example: Provider duty with `base_count=2`, `per_daig_count=1.5`, and a 10-daig drive:
```
capacity = 2 + CEIL(1.5 * 10) = 2 + 15 = 17 volunteers
```

### Tiered Mode

Lookup the `duty_capacity_rules` row where:
```
tier_min_daigs <= daig_count AND (tier_max_daigs IS NULL OR tier_max_daigs >= daig_count)
```

Return `tier_capacity` from the matching row.

Example tiers for traffic duty:
| Min Daigs | Max Daigs | Capacity |
|-----------|-----------|----------|
| 1 | 5 | 4 |
| 6 | 10 | 8 |
| 11 | null | 12 |

A 7-daig drive → traffic capacity = 8.

### When Capacity Is Calculated

1. **Drive creation** (`createDrive` server action): Fetches all active duties and their capacity rules, calculates capacity for each, inserts `drive_duties` records.
2. **Drive update** (`updateDrive` server action): If `daig_count` changes, recalculates capacity for all drive_duties that don't have a manual override.

### Manual Override

If `drive_duties.manual_capacity_override` is set (not null), it takes precedence over `calculated_capacity`. The auto-assignment algorithm always checks:

```typescript
const cap = dd.manual_capacity_override ?? dd.calculated_capacity;
```

Manual overrides are preserved across daig count changes — recalculation skips duties with overrides.

---

## 10. Data Flow Diagrams

### Flow 1: Create Drive

```
Admin fills out "New Drive" form
         │
         ▼
Server Action: createDrive(formData)
         │
         ├── 1. INSERT into drives table
         │      (name, date, location, daig_count, sunset_time, status)
         │
         ├── 2. Fetch active duties + capacity rules
         │      │
         │      ▼
         │      For each active duty:
         │        Calculate capacity from daig_count using rule
         │        │
         │        ▼
         │      INSERT drive_duties
         │        (drive_id, duty_id, calculated_capacity, capacity_mode)
         │
         ├── 3. Fetch app_config.reminder_defaults
         │      │
         │      ▼
         │      If sunset_time is set and reminders configured:
         │        For each reminder template:
         │          Calculate scheduled_at = sunset - hours_before_sunset
         │          │
         │          ▼
         │        INSERT reminder_schedules
         │          (drive_id, type, template, scheduled_at)
         │
         └── 4. revalidatePath("/drives")
```

### Flow 2: Volunteer Self-Registration

```
Volunteer opens /volunteer/register (public)
         │
         ▼
Fills form: name, phone, gender, available drives
         │
         ▼
Client-side: UPSERT volunteer (by phone number)
         │
         ▼
INSERT volunteer_availability for each selected drive
         │
         ▼
POST /api/public/auto-assign
  Body: { volunteerId, driveIds }
         │
         ▼
createAdminClient() ── bypasses RLS
         │
         ▼
For each driveId:
  autoAssignVolunteer(supabase, volunteerId, driveId)
         │
         ▼
Return: { assignments: [{ drive: "Day 1", duty: "Provider" }, ...] }
         │
         ▼
Display confirmation to volunteer
```

### Flow 3: AI Calling

```
Admin selects volunteers on /drives/[id]/calls page
         │
         ▼
POST /api/calls/trigger
  Body: { driveId, volunteerIds }
  Auth: Supabase session (JWT claims)
         │
         ├── Check app_config.ai_calling.enabled
         │     → If false, return 400 error
         │
         ├── For each volunteer:
         │     INSERT communication_log
         │       (channel: "ai_call", direction: "outbound", content: "AI call initiated")
         │
         └── Forward to Railway service:
               POST {RAILWAY_SERVICE_URL}/api/calls/batch
               Auth: Bearer {RAILWAY_API_SECRET}
               Body: { driveId, volunteerIds }
                    │
                    ▼
              RetellClient.batchCall()
                → Retell AI API initiates Urdu phone calls
                    │
                    ▼
              Retell webhook → POST /api/webhooks/retell (Railway)
                → RetellClient.handleWebhook()
                → UPDATE communication_log (call_result, duration, transcript)
                → UPDATE assignment status if volunteer confirmed/declined
                    │
                    ▼
              Supabase Realtime broadcasts assignment change
                    │
                    ▼
              Live dashboard (/drives/[id]/live) updates in real time
```

### Flow 4: WhatsApp Reminders

```
Cron job runs every minute (Railway service)
         │
         ▼
Query reminder_schedules WHERE:
  is_sent = false AND scheduled_at <= NOW()
         │
         ▼
For each pending reminder:
  │
  ├── Fetch drive info (name, location, sunset_time)
  │
  ├── Fetch assignments for this drive
  │     WHERE status IN ("assigned", "confirmed")
  │     JOIN volunteers (name, phone) + duties (name)
  │
  └── For each assignment:
        │
        ├── Substitute template variables:
        │     {name} → volunteer.name
        │     {duty} → duty.name
        │     {drive_name} → drive.name
        │     {sunset_time} → drive.sunset_time
        │     {location} → drive.location_name
        │
        ├── WhatsAppManager.sendMessage(phone, message)
        │
        └── INSERT communication_log
              (channel: "whatsapp", direction: "outbound", content: message)
         │
         ▼
UPDATE reminder_schedules SET is_sent=true, sent_at=NOW()
```

### Flow 5: WhatsApp Keyword Detection

```
Inbound WhatsApp message received (Baileys listener)
         │
         ▼
WhatsAppManager detects message from known JID
         │
         ▼
Lookup volunteer by whatsapp_jid or phone number
         │
         ▼
Check message content against keyword lists (from app_config.whatsapp):
  confirm_keywords: ["confirm", "yes", "haan", "ji", "ha", "han"]
  cancel_keywords:  ["cancel", "no", "nahi", "nhi"]
         │
         ├── Match confirm keyword?
         │     → Find latest "assigned" assignment for this volunteer
         │     → UPDATE assignment SET status="confirmed", confirmed_at=NOW()
         │     → INSERT communication_log (direction: "inbound")
         │
         ├── Match cancel keyword?
         │     → Find latest active assignment
         │     → UPDATE assignment SET status="cancelled", cancelled_at=NOW()
         │     → INSERT communication_log (direction: "inbound")
         │     → Trigger waitlist promotion (if waitlist_auto_fill enabled)
         │
         └── No keyword match?
               → Log message to communication_log but take no action
```

---

## 11. Railway Service

### Why It Exists

The Railway service (`railway-service/`) exists because certain operations cannot run within a Next.js serverless environment:

- **WhatsApp (Baileys)** requires a persistent WebSocket connection that survives between requests
- **Cron jobs** need a long-running process to schedule periodic tasks
- **Google Sheets sync** runs on a schedule every 5 minutes
- **AI calling** involves batch operations and webhook handling that benefit from a dedicated server

The core Next.js app works without the Railway service for basic operations (managing drives, volunteers, duties, manual assignments). The Railway service adds automation: scheduled reminders, WhatsApp messaging, AI calling, Google Sheets import, and automatic status transitions.

### Authentication

All Railway API endpoints (except `/health` and webhooks) require a Bearer token:

```
Authorization: Bearer {RAILWAY_API_SECRET}
```

This shared secret is configured in both the Next.js app and the Railway service environment.

### Endpoints

| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| GET | `/health` | None | — | `{ status, whatsapp, uptime }` | Health check with WhatsApp connection status |
| POST | `/api/whatsapp/connect` | Bearer | — | `{ status: "connecting" }` | Initiate WhatsApp connection (generates QR code) |
| POST | `/api/whatsapp/send` | Bearer | `{ phone, message }` | `{ status: "sent" }` | Send a WhatsApp message to a phone number |
| POST | `/api/whatsapp/group/add` | Bearer | `{ phone, groupJid }` | `{ status: "added" }` | Add a phone number to a WhatsApp group |
| POST | `/api/sheets/sync` | Bearer | — | `{ synced: number }` | Trigger manual Google Sheets sync |
| POST | `/api/calls/batch` | Bearer | `{ driveId, volunteerIds }` | `{ results: [...] }` | Initiate batch AI calls via Retell |
| POST | `/api/webhooks/retell` | None | Retell payload | `{ received: true }` | Retell AI webhook for call completion |

### Cron Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| `*/5 * * * *` | Google Sheets Sync | Syncs new volunteers from configured Google Sheets every 5 minutes |
| `* * * * *` | Send Reminders | Checks `reminder_schedules` every minute; sends WhatsApp messages for due reminders |
| `* * * * *` | AI Call Trigger | Checks if it's time to auto-call unconfirmed volunteers (based on `ai_calling.auto_call_hours_before_sunset`) |
| `0 21 * * *` | Update Sunset Times | Daily at 2 AM PKT (21:00 UTC): fetches sunset times from Aladhan API for drives in the next 7 days |
| `*/2 * * * *` | Waitlist Promotion | Every 2 minutes: checks for open capacity and promotes waitlisted volunteers (if `assignment_rules.waitlist_auto_fill` is enabled) |
| `*/5 * * * *` | WhatsApp Health Check | Every 5 minutes: if WhatsApp is disconnected, attempts auto-reconnect |
| `0 * * * *` | Drive Status Transitions | Hourly: `open` → `in_progress` (on drive day), `in_progress` → `completed` (next day) |

### Railway Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Express server port (default: 3001, Railway sets this automatically) |
| `SUPABASE_URL` | Supabase project URL (same as `NEXT_PUBLIC_SUPABASE_URL` but without the prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin database access |
| `RAILWAY_API_SECRET` | Shared secret for authenticating inbound API requests |
| `RETELL_API_KEY` | Retell AI API key for phone calls |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account JSON for Sheets API access |

---

## 12. Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)
- A **Supabase** project (free tier works for development)

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd next-comms-portal
npm install
```

### Step 2: Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
# Required — get these from your Supabase project dashboard (Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional — only needed if running the Railway service
RAILWAY_SERVICE_URL=http://localhost:3001
RAILWAY_API_SECRET=any_shared_secret_you_choose
```

**Where to find these keys:**
- Go to your Supabase dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable key (safe for client-side)
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (server-side only, never expose to client)

### Step 3: Verify Database

The database schema should already be set up (e.g. from `supabase/full_schema.sql` in the Supabase SQL Editor). Verify by checking the Supabase Table Editor — you should see 13 tables.

### Step 4: Create Admin Account

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/auth/sign-up`
3. Create an account with your email
4. Confirm your email (check Supabase Auth > Users if the confirmation email doesn't arrive)

### Step 5: First-Time App Setup

Once logged in, follow this sequence:

1. **Create a Season** — Go to Settings > General and create a Ramadan season (e.g., "Ramadan 1447", start/end dates, Hijri year). Mark it as active.
2. **Verify Duties** — Go to Duties and confirm the default duties exist (Provider, Dari, Thaal, Traffic, Sherbet, Daig). These are included in the seed data in `supabase/full_schema.sql`.
3. **Create a Drive** — Go to Drives > New Drive. Enter a date, location, and daig count. The sunset time will auto-fetch from the Aladhan API.
4. **Add Volunteers** — Either add manually via Volunteers > New, or have volunteers sign up via the public form at `/volunteer/register`.
5. **Assign Volunteers** — Go to the drive's Assignments page. Use "Auto-Assign All" to batch-assign, or drag-and-drop on the Kanban board.

### Step 6 (Optional): Railway Service Local Setup

```bash
cd railway-service
npm install
```

Create `railway-service/.env`:
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RAILWAY_API_SECRET=same_secret_as_nextjs_app
```

```bash
npm run dev
```

The Railway service will start on port 3001 with hot-reloading via `tsx watch`.

---

## 13. Environment Variables Guide

### Next.js App Variables

| Variable | Required | How to Get | What Happens If Missing |
|----------|----------|-----------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard > Settings > API > Project URL | App shows "placeholder" warning, no data loads |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase Dashboard > Settings > API > Publishable key | Same as above — auth and data fetching won't work |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for server features) | Supabase Dashboard > Settings > API > service_role key | Admin operations fail (public auto-assign, etc.) |
| `RAILWAY_SERVICE_URL` | No | Your Railway deployment URL or `http://localhost:3001` | AI calling and WhatsApp features are unavailable; core app still works |
| `RAILWAY_API_SECRET` | No (but required if Railway is configured) | You choose this — any random string shared between both services | Railway API calls are rejected with 401 |

### Railway Service Variables

| Variable | Required | How to Get | What Happens If Missing |
|----------|----------|-----------|------------------------|
| `PORT` | No | Railway sets automatically; default 3001 | Uses port 3001 |
| `SUPABASE_URL` | Yes | Same as `NEXT_PUBLIC_SUPABASE_URL` | Service cannot connect to database |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same as Next.js service role key | All database operations fail |
| `RAILWAY_API_SECRET` | Yes | Same value as Next.js app | All authenticated endpoints reject requests |
| `RETELL_API_KEY` | Only for AI calling | Retell AI dashboard | AI calls won't initiate |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Only for Sheets sync | Google Cloud Console > Service Accounts | Google Sheets sync won't work |

**Important:** The core Next.js app (drives, volunteers, duties, assignments, analytics) works without the Railway service. Railway adds automation (WhatsApp, AI calling, cron jobs, Sheets sync).

---

## 14. Supabase Client Patterns

The project uses four distinct Supabase client patterns. Using the wrong one is a common source of bugs.

| Pattern | File | Created Via | Auth Level | When to Use |
|---------|------|-------------|------------|-------------|
| **Browser** | `lib/supabase/client.ts` | `createBrowserClient()` | User session (cookies) | Client Components (`"use client"`) — forms, real-time subscriptions, any browser-side data fetching |
| **Server** | `lib/supabase/server.ts` | `createServerClient()` | User session (cookies) | Server Components, Server Actions, API Route Handlers — any server-side code that should respect the logged-in user's permissions |
| **Admin** | `lib/supabase/admin.ts` | `createClient()` with service role | Service role (bypasses RLS) | Privileged operations where RLS would block access — public API endpoints, background jobs, cross-user operations |
| **Proxy** | `lib/supabase/proxy.ts` | `createServerClient()` | User session (cookies) | Middleware only — session refresh and auth redirects |

### Key Rules

1. **Never store server clients in global variables.** Always create a fresh client inside each function. This is critical for Fluid compute where globals can be shared across requests.

```typescript
// WRONG — will leak sessions between users
const supabase = await createClient();
export async function myAction() { ... }

// RIGHT — fresh client per invocation
export async function myAction() {
  const supabase = await createClient();
  // ...
}
```

2. **Server client is async.** The server client needs to read cookies, which is an async operation in Next.js:

```typescript
// Browser client — synchronous
const supabase = createClient();

// Server client — must await
const supabase = await createClient();
```

3. **Admin client bypasses RLS.** Only use it when you specifically need to bypass Row Level Security — never for regular user-facing operations.

4. **Import paths matter.** Always import from the correct path:

```typescript
// Client Components
import { createClient } from "@/lib/supabase/client";

// Server Components, Actions, Route Handlers
import { createClient } from "@/lib/supabase/server";

// Admin operations
import { createAdminClient } from "@/lib/supabase/admin";
```

---

## 15. Code Patterns & Conventions

### Page Component Pattern (Client)

Most dashboard pages follow this pattern:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

export default function MyPage() {
  const [data, setData] = useState<Tables<"my_table">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data, error } = await supabase.from("my_table").select("*");
      if (error) {
        toast.error("Failed to load data");
      } else {
        setData(data || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Page</h1>
      {/* Content using shadcn/ui components */}
    </div>
  );
}
```

### Server Action Pattern

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function myAction(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get("name") as string;

  const { error } = await supabase.from("my_table").insert({ name });

  if (error) return { error: error.message };

  revalidatePath("/my-page");
  return { success: true };
}
```

### Realtime Subscription Pattern

```typescript
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LivePage({ driveId }: { driveId: string }) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`drive-${driveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assignments",
          filter: `drive_id=eq.${driveId}`,
        },
        (payload) => {
          // Handle INSERT, UPDATE, DELETE events
          console.log("Assignment change:", payload);
        },
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driveId]);

  // ...
}
```

### Phone Normalization

All phone numbers are stored in `+92XXXXXXXXXX` format (Pakistan country code). Use the utility functions:

```typescript
import { normalizePhone, formatPhone } from "@/lib/utils";

// Input normalization (before saving to DB)
normalizePhone("0300-1234567")   // → "+923001234567"
normalizePhone("03001234567")    // → "+923001234567"
normalizePhone("923001234567")   // → "+923001234567"
normalizePhone("+923001234567")  // → "+923001234567"

// Display formatting (for UI)
formatPhone("+923001234567")     // → "+92 300 1234567"
```

### Date and Time Formatting

```typescript
import { formatDate, formatTime } from "@/lib/utils";

formatDate("2026-03-15")  // → "Sat, 15 Mar 2026" (en-PK locale)
formatTime("18:30")        // → "6:30 PM"
formatTime(null)           // → "—"
```

### Status Color Badges

```typescript
import { getStatusColor } from "@/lib/utils";

// Returns Tailwind class string for status badges
getStatusColor("assigned")    // → "bg-blue-100 text-blue-800"
getStatusColor("confirmed")   // → "bg-green-100 text-green-800"
getStatusColor("en_route")    // → "bg-yellow-100 text-yellow-800"
getStatusColor("arrived")     // → "bg-emerald-100 text-emerald-800"
getStatusColor("completed")   // → "bg-green-100 text-green-800"
getStatusColor("cancelled")   // → "bg-red-100 text-red-800"
getStatusColor("no_show")     // → "bg-red-100 text-red-800"
getStatusColor("waitlisted")  // → "bg-orange-100 text-orange-800"
```

### shadcn/ui Convention

- Components live in `components/ui/`
- **Never edit these files manually** — they are managed by the shadcn/ui CLI
- Add new components via: `npx shadcn@latest add <component-name>`
- Configuration in `components.json`: New York style, RSC enabled, Lucide icons, `@/` aliases

### Path Alias

All imports use `@/*` which maps to the project root:

```typescript
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
```

### Theming

- Colors are defined as CSS variables in HSL format in `app/globals.css`
- Referenced in Tailwind via `hsl(var(--primary))`, `hsl(var(--background))`, etc.
- Dark mode uses the `class` strategy (toggled by `next-themes`)
- Never use hardcoded colors — always use semantic tokens: `text-foreground`, `bg-card`, `text-muted-foreground`, `border`, etc.

---

## 16. App Config Reference

All application settings are stored in the `app_config` table as JSON values, keyed by string.

### `assignment_rules`

Controls the auto-assignment algorithm behavior.

```json
{
  "history_lookback": "current_season",
  "waitlist_auto_fill": true,
  "male_priority_order": ["provider", "dari", "traffic", "daig", "thaal", "sherbet"],
  "female_priority_order": ["thaal", "female-provider", "female-dari", "provider", "dari", "sherbet"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `history_lookback` | string | How far back to look for volunteer duty history. `"current_season"` or `"all_time"`. |
| `waitlist_auto_fill` | boolean | If true, the Railway cron job automatically promotes waitlisted volunteers when capacity opens. |
| `male_priority_order` | string[] | Duty slugs in priority order for male first-time volunteers. |
| `female_priority_order` | string[] | Duty slugs in priority order for female first-time volunteers. |

### `ai_calling`

Controls the Retell AI phone calling integration.

```json
{
  "enabled": false,
  "provider": "retell",
  "retell_api_key": "",
  "retell_agent_id": "",
  "retell_from_number": "",
  "stagger_delay_ms": 2000,
  "auto_call_hours_before_sunset": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Master switch for AI calling. If false, call triggers return a 400 error. |
| `provider` | string | Calling provider identifier (currently only "retell"). |
| `retell_api_key` | string | Retell AI API key. |
| `retell_agent_id` | string | Retell agent configured for Urdu-language confirmation calls. |
| `retell_from_number` | string | Phone number to call from. |
| `stagger_delay_ms` | number | Delay between batch calls to avoid rate limiting. |
| `auto_call_hours_before_sunset` | number | Hours before sunset to automatically trigger calls for unconfirmed volunteers (used by cron job). |

### `whatsapp`

Controls WhatsApp messaging integration.

```json
{
  "enabled": false,
  "confirm_keywords": ["confirm", "yes", "haan", "ji", "ha", "han"],
  "cancel_keywords": ["cancel", "no", "nahi", "nhi"],
  "rate_limit_per_second": 1,
  "rate_limit_burst": 5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Master switch for WhatsApp messaging. |
| `confirm_keywords` | string[] | Inbound message keywords that confirm attendance. Includes Urdu transliterations. |
| `cancel_keywords` | string[] | Inbound message keywords that cancel attendance. Includes Urdu transliterations. |
| `rate_limit_per_second` | number | Maximum messages per second (to avoid WhatsApp ban). |
| `rate_limit_burst` | number | Burst allowance for rate limiting. |

### `reminder_defaults`

Default reminder templates created when a new drive is set up.

```json
{
  "reminders": [
    {
      "type": "first_reminder",
      "hours_before_sunset": 6,
      "template": "Assalam o Alaikum {name}! Reminder: You are assigned to {duty} for {drive_name} today at {location}. Sunset is at {sunset_time}. Please confirm by replying YES."
    },
    {
      "type": "second_reminder",
      "hours_before_sunset": 3,
      "template": "Reminder: {name}, please confirm your attendance for {duty} at {drive_name}. Sunset at {sunset_time}."
    },
    {
      "type": "final_reminder",
      "hours_before_sunset": 1.5,
      "template": "{name}, iftaar in 1.5 hours! Please head to {location} for your {duty} duty. JazakAllah Khair!"
    }
  ]
}
```

Template variables: `{name}`, `{duty}`, `{drive_name}`, `{sunset_time}`, `{location}`

### `alerts`

Alert and notification thresholds.

```json
{
  "notify_admins": true,
  "deficit_threshold_percent": 20
}
```

| Field | Type | Description |
|-------|------|-------------|
| `notify_admins` | boolean | Whether to send admin alerts for deficit conditions. |
| `deficit_threshold_percent` | number | Alert when a duty has fewer than this percentage of required volunteers confirmed. |

---

## 17. Common Tasks Guide

### Add a New Page

1. Create the file at the appropriate path:
   - Protected page: `app/(dashboard)/my-section/page.tsx`
   - Public page: `app/my-page/page.tsx`
2. Follow the [Page Component Pattern](#page-component-pattern-client) above
3. Add navigation link to `components/dashboard/sidebar.tsx` if it's a main section
4. The `(dashboard)` route group automatically provides the Sidebar + Topbar layout

### Add a New Duty

1. Insert into the `duties` table via the Supabase dashboard (SQL Editor):
   ```sql
   INSERT INTO duties (name, slug, display_order, gender_restriction, is_active)
   VALUES ('My Duty', 'my-duty', 7, null, true);
   ```
2. Add capacity rules:
   ```sql
   INSERT INTO duty_capacity_rules (duty_id, capacity_mode, base_count, per_daig_count)
   VALUES ('<duty-id>', 'linear', 2, 1.0);
   ```
3. If the duty has a specific gender-based priority, update the `assignment_rules` config to include the new slug in `male_priority_order` and/or `female_priority_order`
4. Existing drives won't automatically get `drive_duties` rows for the new duty — only newly created drives will

### Modify the Assignment Algorithm

The algorithm is in `lib/assignment/auto-assign.ts`. Key modification points:

- **Change priority order**: Edit `app_config.assignment_rules` via Settings > Assignment (no code change needed)
- **Change capacity logic**: Modify the `hasCapacity()` function
- **Change gender logic**: Modify the `genderAllowed()` function
- **Add new assignment criteria**: Add a new step between Step 1 and Step 2 in `autoAssignVolunteer()`

### Add a New shadcn/ui Component

```bash
npx shadcn@latest add <component-name>
```

Example: `npx shadcn@latest add accordion`

This adds the component to `components/ui/` with proper styling. Never edit the generated file directly.

### Add a New App Config Setting

1. Insert a new row in `app_config`:
   ```sql
   INSERT INTO app_config (key, value, description)
   VALUES ('my_setting', '{"enabled": false}'::jsonb, 'Description of my setting');
   ```
2. Read it in code:
   ```typescript
   const { data } = await supabase
     .from("app_config")
     .select("value")
     .eq("key", "my_setting")
     .single();
   const config = data?.value as { enabled: boolean };
   ```
3. Optionally add a settings page at `app/(dashboard)/settings/my-setting/page.tsx`

### Add a New Cron Job

1. Open `railway-service/src/cron/scheduler.ts`
2. Add a new `CronJob` instance in the `setupCronJobs` function:
   ```typescript
   new CronJob("*/10 * * * *", async () => {
     console.log("[CRON] My new job");
     try {
       // Your logic here
     } catch (error) {
       console.error("[CRON] My job error:", error);
     }
   }).start();
   ```
3. The cron syntax uses standard cron format (5 fields: minute, hour, day-of-month, month, day-of-week)

### Test Without Railway

The app works without the Railway service for all core features:
- Drive CRUD, volunteer management, duty management
- Manual and auto assignment
- Analytics and settings
- Auth flows

What requires Railway:
- WhatsApp messaging (automated reminders, keyword detection)
- AI calling (Retell integration)
- Google Sheets sync
- Automatic drive status transitions
- Automatic sunset time updates
- Automatic waitlist promotion

### Regenerate Supabase Types

After making schema changes, regenerate the TypeScript types using the Supabase MCP `generate_typescript_types` tool. The output goes into `lib/supabase/types.ts`.

---

## 18. Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| **"No active season" — everything appears empty** | No season is marked as `is_active = true` | Go to Settings > General, create a season (or edit an existing one), and ensure it's marked as active |
| **Sunset time not fetching for new drives** | Aladhan API is unreachable or the date format is wrong | Check network access; the API call is in `fetchSunsetTime()` in `app/(dashboard)/drives/actions.ts`. Verify the date is in `YYYY-MM-DD` format. Sunset can also be entered manually. |
| **Auto-assign returns 0 assignments** | No `drive_duties` exist for the drive, or all duties are at capacity, or no volunteers are in `volunteer_availability` | Check: (1) The drive has drive_duties (created automatically when drive is created). (2) Capacity is > 0. (3) Volunteers have signed up for the drive. |
| **"Unauthorized" on API routes** | Session expired or user is not logged in | Middleware redirects to `/auth/login`. If using API routes directly, ensure the Supabase session cookie is present. |
| **WhatsApp not connecting** | Railway service not running, or Baileys session expired | Start the Railway service, go to Settings > WhatsApp, and initiate a new connection. Scan the QR code with WhatsApp. |
| **Types out of sync with database** | Schema was changed but `types.ts` wasn't regenerated | Run the Supabase MCP `generate_typescript_types` tool and replace the contents of `lib/supabase/types.ts` |
| **shadcn/ui component not rendering correctly** | Component was manually edited or CSS variables are missing | Re-add the component: `npx shadcn@latest add <name>`. Check that `globals.css` has all required CSS variables. |
| **Drive status stuck on "open" / not transitioning** | Railway service cron not running | The drive status transition cron runs hourly in Railway. Without Railway, manually update the status via the drive detail page. |
| **Capacity shows 0 for all duties** | No `duty_capacity_rules` exist for the duties | Go to Duties > [duty] > Rules and configure either linear or tiered capacity rules |
| **Reminders not sending** | Railway service not running, WhatsApp not connected, or reminders already marked as sent | Check Railway logs. Verify `reminder_schedules.is_sent = false` and `scheduled_at` is in the past. Ensure WhatsApp is connected. |
| **Duplicate volunteer entries** | Phone number entered in different formats | The public registration form normalizes phones, but manual entry might not. Always use `normalizePhone()` before upserting. |
| **Dark mode looks broken** | Component using hardcoded colors instead of CSS variables | Use semantic Tailwind classes (`text-foreground`, `bg-card`) instead of hardcoded values (`text-black`, `bg-white`) |
| **`"use client"` error in server component** | Trying to use hooks (useState, useEffect) in a server component | Add `"use client"` directive at the top of the file, or extract the interactive part into a separate client component |
| **Railway API calls rejected with 401** | `RAILWAY_API_SECRET` mismatch between Next.js and Railway | Ensure both services use the exact same secret value in their environment variables |
