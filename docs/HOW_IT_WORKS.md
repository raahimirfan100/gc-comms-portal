  # How Grand Citizens Iftaar Drive Management Works

A simple guide to understanding the entire system, step by step.

---

## What Is This App?

Grand Citizens is a charity in Karachi that feeds hundreds of people on the streets every evening during Ramadan. They need dozens of volunteers each night to cook, serve, manage traffic, and more. This app coordinates all of that — replacing spreadsheets and WhatsApp groups.

---

## The Big Picture

```
Season (Ramadan 1447)
  └── Drive 1 (March 1st, Tariq Road, 10 daigs)
  │     ├── Provider duty (17 slots)
  │     ├── Dari duty (12 slots)
  │     ├── Traffic duty (8 slots)
  │     └── ...more duties
  │
  └── Drive 2 (March 2nd, Burns Garden, 8 daigs)
  │     ├── Provider duty (14 slots)
  │     └── ...
  │
  └── Drive 3, 4, 5... (one per evening for ~30 days)

Volunteers sign up → get assigned to duties → get reminded → show up
```

---

## Step-by-Step Flow

### Step 1: Admin Sets Up a Season

Before Ramadan starts, an admin creates a **season** — e.g. "Ramadan 1447" with start and end dates.

Everything in the app is scoped to a season, so last year's data stays separate.

---

### Step 2: Admin Creates Drives

A **drive** = one evening's feeding event.

The admin fills in:
- **Date** (e.g. March 15th)
- **Location** (e.g. Tariq Road — picked on a map)
- **Daig count** (e.g. 10 daigs — this is how many giant cooking pots they'll use)

The app automatically:
- Fetches the **exact sunset time** for Karachi on that date (because iftaar starts at sunset)
- Calculates **how many volunteers each duty needs** based on the daig count

> **Why daig count matters:** More daigs = more food = more people to serve = more volunteers needed. The system uses formulas like "2 base + 1.5 per daig" to figure out the exact number.

---

### Step 3: Volunteers Sign Up

Volunteers go to a **public registration page** (no login needed). It's a 3-step form:

1. **Enter phone number** — if they've signed up before, their details are pre-filled
2. **Fill in details** — name, email, gender, school/company
3. **Pick which drives** they're available for — they see cards with the date, location, sunset time, and a map

They check the drives they can attend and hit "Sign Up."

---

### Step 4: Auto-Assignment (The Magic)

The moment a volunteer signs up, the system **instantly assigns them a duty**. Here's how it decides:

#### For returning volunteers:
> "Ali volunteered 5 times before. He did Provider 4 times and Dari once. Let's try Provider first since that's his most common duty."

The system tries their most-frequent past duty first. If it's full, it tries the next most-frequent, and so on.

#### For first-time volunteers:
> "Sara is new and female. The female priority order is: Thaal → Provider → Dari → Sherbet. Let's try Thaal first."

The system follows a priority list based on gender:
- **Males:** Provider → Dari → Traffic → Daig → Thaal → Sherbet
- **Females:** Thaal → Provider → Dari → Sherbet

It tries each duty in order until it finds one with room.

#### If everything is full:
> "All duties are at capacity. Sara goes on the waitlist at position #3."

If someone cancels later, the waitlist automatically promotes the next person in line.

#### The two rules it always checks:
1. **Gender restriction** — some duties are male-only or female-only. The system never violates this.
2. **Capacity** — each duty has a max number of volunteers. The system never over-assigns.

---

### Step 5: Confirmation (Hours Before the Drive)

Once volunteers are assigned, the system needs to confirm they're actually coming.

**WhatsApp reminders go out automatically:**
- 6 hours before sunset: "You're assigned to Provider duty at Tariq Road. Sunset at 6:30 PM. Reply YES to confirm."
- 3 hours before: "Please confirm your attendance."
- 1.5 hours before: "Iftaar in 1.5 hours! Please head to the location."

**AI phone calls** (in Urdu) are made to volunteers who haven't confirmed yet.

**Volunteers reply on WhatsApp:**
- "Yes" / "Haan" / "Ji" → status changes to **Confirmed**
- "No" / "Nahi" → status changes to **Cancelled**, and the next person on the waitlist gets promoted

---

### Step 6: Drive Day (Real-Time Monitoring)

On the day of the drive, admins use the **Live Dashboard** to track everything in real time:

```
Provider Duty (17 needed)
  ✅ Ali — Confirmed
  ✅ Ahmed — Confirmed
  🚗 Usman — En Route
  ❌ Bilal — No Show
  ⏳ Hassan — Assigned (not confirmed yet)
```

The dashboard updates **live** — no page refresh needed. When a volunteer texts "on my way," their status changes instantly on screen.

Admins can see:
- Which duties are fully staffed
- Which duties are short on volunteers (deficit alerts)
- Who's confirmed, en route, arrived, or no-show

---

### Step 7: After the Drive

The drive status automatically changes to **Completed** the next day.

Admins can view **Analytics** showing:
- How many volunteers showed up vs. were assigned
- Which duties were understaffed
- Leaderboard of most active volunteers
- Trends across the season

---

## The Duties Explained

| Duty | What They Do | Typical Gender |
|------|-------------|----------------|
| **Provider** | Serve food directly to people sitting on the street | Usually male |
| **Dari** | Lay out floor mats on the road for people to sit on | Both |
| **Thaal** | Distribute and collect large serving trays | Usually female |
| **Traffic** | Manage road closures and vehicle flow | Male only |
| **Sherbet** | Prepare and serve drinks | Both |
| **Daig** | Help with cooking in the giant pots | Usually male |

---

## How Capacity Works

Each duty's volunteer count is calculated from the **daig count** using simple formulas:

**Linear formula example (Provider):**
```
Base: 2 volunteers
Per daig: 1.5 volunteers

10 daigs → 2 + (1.5 × 10) = 17 volunteers needed
```

**Tiered formula example (Traffic):**
```
1-5 daigs   → 4 volunteers
6-10 daigs  → 8 volunteers
11+ daigs   → 12 volunteers

7 daigs → 8 volunteers needed
```

Admins can also **manually override** the capacity for any duty on any drive.

---

## What the Admin Does Day-to-Day

| Task | Where | How Often |
|------|-------|-----------|
| Create drives for upcoming dates | Drives → New Drive | Once per drive |
| Check volunteer assignments | Drives → [Drive] → Assignments | Before each drive |
| Drag-and-drop reassign volunteers | Kanban board on Assignments page | As needed |
| Monitor live status on drive day | Drives → [Drive] → Live | During the drive |
| Trigger AI calls to unconfirmed volunteers | Drives → [Drive] → Calls | Hours before drive |
| Review analytics | Analytics page | Weekly / end of season |
| Configure settings | Settings pages | Once during setup |

---

## What Happens Automatically (No Admin Action Needed)

| What | When | How |
|------|------|-----|
| Volunteer gets assigned a duty | Immediately after sign-up | Auto-assignment algorithm |
| Waitlisted volunteer gets promoted | When someone cancels | Cron job every 2 minutes |
| WhatsApp reminders sent | Hours before sunset | Cron job every minute |
| AI calls to unconfirmed volunteers | Configurable hours before sunset | Cron job |
| Drive status: open → in progress | On drive day | Cron job (hourly) |
| Drive status: in progress → completed | Next day | Cron job (hourly) |
| Sunset times updated | Daily at 2 AM | Cron job |
| Google Sheets volunteer import | Every 5 minutes | Cron job |

---

## Key Terms

| Term | Meaning |
|------|---------|
| **Iftaar** | The meal at sunset to break the Ramadan fast |
| **Drive** | One evening's feeding event |
| **Season** | One Ramadan period (~30 days) |
| **Daig** | A giant cooking pot — the number of daigs determines the scale |
| **Duty** | A volunteer's assigned role (Provider, Dari, Thaal, etc.) |
| **Capacity** | Max volunteers a duty can accept, calculated from daig count |
| **Waitlist** | Queue for volunteers when all duties are full |
| **Hijri Year** | Islamic calendar year (Ramadan falls in a different month each Gregorian year) |
