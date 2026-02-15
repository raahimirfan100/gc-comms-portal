# Grand Citizens — Iftaar Drive Management

Volunteer coordination platform for organizing Ramadan iftaar feeding drives in Karachi, Pakistan.

![Next.js](https://img.shields.io/badge/Next.js_16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)

## Overview

Grand Citizens runs large-scale iftaar feeding drives during Ramadan, requiring coordination of hundreds of volunteers across multiple events. This system manages the full lifecycle — creating drives with auto-fetched sunset times, assigning volunteers to duties via an auto-assignment algorithm, confirming attendance through AI phone calls (Urdu-language) and WhatsApp messaging, and monitoring everything in real time on drive day.

## Features

### Drive Management
- Create drives with auto-fetched sunset/iftaar times (Aladhan API)
- Status lifecycle: draft → open → in_progress → completed
- Capacity planning per duty based on daig count (linear or tiered rules)

### Volunteer Registry
- Searchable directory with gender filtering and attendance history
- Bulk import from Google Sheets
- Public registration form for volunteer sign-ups

### Duty Board
- Drag-and-drop Kanban assignment interface (dnd-kit)
- Auto-assignment algorithm respecting gender restrictions and capacity limits
- Waitlist management with automatic promotion

### Live Dashboard
- Real-time volunteer status monitoring via Supabase Realtime
- Check-in tracking (en route, arrived, completed, no-show)
- Deficit alerts when duties are understaffed

### AI Calling
- Retell AI integration for Urdu-language confirmation calls
- Batch call operations for entire drives
- Call result tracking with transcripts logged to communication history

### WhatsApp Integration
- Baileys-based WhatsApp messaging via Railway background service
- Keyword detection for confirm/cancel responses
- QR code authentication flow

### Reminders
- Scheduled reminders tied to sunset time offsets
- Configurable message templates

### Analytics
- Volunteer attendance charts and drive metrics via Recharts
- Leaderboards

### Multi-Season Support
- All data scoped by Ramadan season (Hijri year)
- Season switching for historical comparison

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database & Auth | Supabase (Postgres, Auth, Realtime) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (New York style) + Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Date Handling | date-fns |
| Notifications | Sonner |
| Theme | next-themes (light/dark/system) |
| Font | Geist Sans |
| Background Service | Railway (Express + Baileys + Google APIs) |

## Project Structure

```
app/
  (dashboard)/            # Protected dashboard routes
    drives/               # Drive CRUD, assignments, call center, live dashboard
    volunteers/           # Volunteer registry, profiles, bulk import
    duties/               # Duty type configuration and capacity rules
    analytics/            # Charts and leaderboards
    settings/             # General, assignment, calling, reminders, WhatsApp, sheets, alerts
  api/                    # REST endpoints (batch assignments, call triggers, webhooks)
  auth/                   # Authentication pages (login, signup, forgot password)
  volunteer/              # Public registration form
components/
  ui/                     # shadcn/ui primitives (30+ components)
  dashboard/              # Sidebar, Topbar
lib/
  supabase/               # Client, server, admin, proxy, generated types
  assignment/             # Auto-assignment algorithm (single, batch, waitlist promotion)
  utils.ts                # Shared utilities (phone normalization, date formatting)
railway-service/          # Background service (WhatsApp, Google Sheets sync, cron jobs)
  src/
    whatsapp/             # Baileys connection & messaging
    calling/              # Retell AI client
    sheets/               # Google Sheets sync engine
    cron/                 # Scheduled jobs (reminders, syncs)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone <repository-url>
cd next-comms-portal
npm install
```

Copy the environment file and fill in your values:

```bash
cp .env.example .env.local
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `RAILWAY_SERVICE_URL` | URL of the Railway background service |
| `RAILWAY_API_SECRET` | Shared secret for authenticating Railway API calls |

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

The schema is defined in `supabase/full_schema.sql` (apply it in the Supabase SQL Editor). Core tables:

| Table | Purpose |
|---|---|
| `seasons` | Ramadan seasons scoped by Hijri year |
| `drives` | Iftaar drive events with date, location, sunset times, and status |
| `volunteers` | Volunteer profiles with contact info, gender, and engagement tracking |
| `duties` | Duty types (provider, dari, thaal, traffic, etc.) with gender restrictions |
| `drive_duties` | Duty slots per drive with capacity (calculated or manual override) |
| `duty_capacity_rules` | Capacity formulas (linear/tiered) based on daig count |
| `assignments` | Volunteer-to-duty mappings with status tracking and waitlist position |
| `volunteer_availability` | Drive sign-ups from volunteers |
| `communication_log` | All outbound messages (WhatsApp, AI calls) with delivery status and transcripts |
| `reminder_schedules` | Scheduled reminders relative to sunset times |
| `whatsapp_sessions` | WhatsApp connection state and QR codes |
| `google_sheets_sync` | Google Sheets sync state and error history |
| `app_config` | Key-value application settings |

## Key Architecture Decisions

- **App Router with grouped layouts** — `(dashboard)` group for authenticated routes with sidebar/topbar, separate layouts for auth and public pages
- **Server Components by default** — Client Components used only where interactivity is required (forms, drag-and-drop, real-time subscriptions)
- **Supabase Realtime for live updates** — no polling; the live dashboard subscribes to assignment status changes
- **Separate Railway microservice** — long-running tasks (WhatsApp connections, scheduled jobs, Google Sheets sync) run outside the Next.js serverless boundary
- **Pakistan-specific utilities** — phone normalization to +92 format, en-PK date locale, Aladhan API for Karachi sunset times
