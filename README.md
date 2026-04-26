<div align="center">

# ⛑️ ResQLink

### *Connecting Citizens, Volunteers & NGOs — The Moment It Matters Most*

**A real-time AI-powered emergency coordination platform that turns a distress call into a coordinated rescue — in minutes.**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20Storage-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini%201.5%20Flash-AI%20Dispatcher-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Live Demo](#screenshots--demo) · [Report a Bug](issues) · [Request Feature](issues)

</div>

---

## 📌 Problem Statement

When a disaster strikes — a flood, a building collapse, a food shortage — three things happen simultaneously:

1. **Citizens are overwhelmed** and don't know who to call or how to get help fast.
2. **Volunteers are willing** but have no structured way to know where they're needed, what skills are required, or who is coordinating.
3. **NGOs are flooded** with unstructured requests, struggle to match volunteer supply with demand, and have no real-time visibility into what's happening on the ground.

The result is **delayed response, mismatched resources, and lives at risk** — not from a lack of good people, but from a lack of coordination infrastructure.

**ResQLink is that infrastructure.**

---

## 💡 Solution Overview

ResQLink is a **role-based, real-time emergency coordination platform** built for three distinct actors:

| Actor | Core Need | ResQLink's Answer |
|-------|-----------|-------------------|
| 🧑 **Citizen** | Report an emergency and track help | Structured request forms + live status tracking |
| 🙋 **Volunteer** | Know where to go, what to do | AI-matched missions + GPS directions + briefings |
| 🏢 **NGO** | Coordinate teams and prioritize requests | Control center + assignment pipeline + analytics |

When a citizen submits a request, ResQLink's AI dispatcher analyzes the emergency, ranks available volunteers by distance, skill, and trust score, and dispatches the best-fit team — all within seconds. If no NGO responds in 10 minutes, the system escalates automatically.

---

## ✨ Key Features

### 🧑 Citizen
- **Structured emergency reporting** across 4 categories: Food, Disaster, Sanitation, and Others — with category-specific fields (disaster type, affected people count, area size, etc.)
- **Real-time request tracking** with a live status machine: `Created → Matching → Assigned → In Progress → Verification Pending → Completed`
- **Chat channel** with the assigned volunteer/NGO per request
- **Two-way rating system** — rate the volunteer/NGO after resolution; receive a rating in return
- **Misuse reporting** to flag fraudulent or spam requests

### 🙋 Volunteer
- **Availability toggle** — go on-duty/off-duty instantly
- **Mission inbox** — receive assignments with AI-generated mission briefs tailored to the specific emergency
- **Per-volunteer acceptance window** — 5 minutes to accept; auto-released and re-dispatched if not accepted
- **On-field mode** with Google Maps / Leaflet navigation to the emergency location
- **Proof submission** — upload media evidence to mark a task complete
- **Gamified progression** — earn badges (First Responder, Crisis Hero, Rapid Responder, etc.) and climb trust score rankings
- **Rewards page** — track earned badges, completion streaks, and leaderboard position

### 🏢 NGO
- **Control Center** — overview of all active, pending, and completed requests in real time
- **Smart Assignment Pipeline** — view AI rankings and manually confirm or override volunteer dispatch
- **Volunteer Panel** — manage the NGO's registered volunteers, approval status, and availability
- **Team Monitor** — see which volunteers are on which mission, live
- **Analytics Dashboard** — priority zones, task trends, surge alerts, volunteer performance
- **Broadcast Composer** — send targeted messages to volunteers by skill or availability
- **Campaign Creator** — organize structured multi-request relief campaigns
- **NGO Alerts** — real-time shortage alerts when an active mission needs more volunteers

---

## 🔄 System Workflow

```
Citizen submits emergency request
         │
         ▼
 Request stored in Firestore
 Status → "Matching"
         │
         ▼
 Nearby NGOs notified (real-time listener)
         │
    ┌────┴────────────────┐
    │                     │
NGO accepts            No NGO accepts in 10 min
    │                     │
    ▼                     ▼
NGO runs AI dispatch   System auto-escalates globally
(Gemini 1.5 Flash)     (Cloud Function / client engine)
    │                     │
    └──────────┬──────────┘
               │
               ▼
      Volunteers dispatched
      Each gets 5-minute acceptance window
               │
    ┌──────────┴──────────────┐
    │                         │
Volunteer accepts         Volunteer ignores / declines
    │                         │
    ▼                         ▼
Status → "In Progress"    Slot released → next wave dispatched
    │
    ▼
Volunteer submits proof (photo/notes)
    │
    ▼
Status → "Verification Pending"
    │
    ▼
NGO/Citizen verifies → Status → "Completed"
    │
    ▼
Both parties rate each other (1-5 stars)
Trust scores updated
```

---

## 🏗️ System Architecture

### Frontend
A **single-page application (SPA)** built with React 18 + TypeScript, served as a static site hosted on GitHub Pages.

- **State Management**: React Context (`AppDataContext`) + TanStack Query for server-state caching
- **Routing**: React Router v6 with role-aware route rendering
- **Real-time**: Firestore `onSnapshot` listeners for live updates without polling
- **Forms**: React Hook Form + Zod schema validation
- **UI**: shadcn/ui component library on Radix UI primitives + Tailwind CSS

### Backend
**Firebase serverless stack** — zero custom backend servers.

- **Authentication**: Firebase Auth (Email/Password)
- **Database**: Cloud Firestore (NoSQL, document model)
- **Storage**: Firebase Storage (proof uploads, profile images)
- **Server Logic**: Firebase Cloud Functions v2 (Node.js) for timer-based escalation

### Database
Cloud Firestore with structured collections (see [Database Design](#database-design)).

### Real-Time Flow
```
Firestore Document Write
       │
       ▼
onSnapshot listener fires
       │
       ▼
AppDataContext updates in-memory state
       │
       ▼
React re-render → UI updates
(< 100ms end-to-end on stable networks)
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 + TypeScript | UI and component logic |
| Build Tool | Vite 5 + SWC | Fast dev server and production build |
| Styling | Tailwind CSS 3 | Utility-first responsive design |
| UI Components | shadcn/ui + Radix UI | Accessible, composable UI primitives |
| Animations | Framer Motion | Smooth micro-interactions |
| State / Cache | TanStack Query v5 | Server-state synchronisation |
| Forms | React Hook Form + Zod | Type-safe validated forms |
| Auth | Firebase Authentication | Email/password sign-up and login |
| Database | Cloud Firestore | Real-time NoSQL document store |
| Storage | Firebase Storage | Media uploads |
| Cloud Functions | Firebase Functions v2 | Server-side escalation timers |
| AI / ML | Google Gemini 1.5 Flash | Volunteer matching + mission briefs |
| Maps | React Leaflet + Google Maps | Geolocation + directions |
| Geo Math | Custom Haversine engine | Distance-based volunteer scoring |
| Charts | Recharts | NGO analytics dashboard |
| Internationalization | Custom i18n engine | English + Hindi (800+ strings) |
| Package Manager | Bun | Fast installs |

---

## 🗄️ Database Design

All data lives in Cloud Firestore. Below are the primary collections:

| Collection | Key Fields | Purpose |
|------------|------------|---------|
| `profiles` | `user_id`, `role`, `full_name`, `trust_score`, `location`, `badges` | One document per user; stores role, name, and reputation |
| `volunteers` | `user_id`, `available`, `skills`, `location`, `current_task_id`, `trust_score` | Volunteer operational state — availability and current assignment |
| `ngos` | `user_id`, `org_name`, `services`, `location`, `approved`, `category_tags` | NGO profile and service coverage definition |
| `emergency_requests` | `user_id`, `category`, `urgency`, `status`, `location`, `assigned_volunteer_ids`, `ngo_id`, `eta` | The core entity — one document per citizen request with full lifecycle |
| `emergency_requests/{id}/assignments` | `volunteer_id`, `status`, `is_leader`, `accepted_at`, `escalated` | **Subcollection** — per-volunteer assignment state (decoupled from request) |
| `notifications` | `user_id`, `title`, `body`, `type`, `read`, `created_at` | In-app notification feed per user |
| `request_reports` | `reporter_id`, `request_id`, `reason` | Misuse / fraud reports (write-only; admin-read) |

---

## 🤖 AI / Smart Logic

### How Volunteer Assignment Works

ResQLink uses a **two-layer matching system**:

#### Layer 1 — Algorithmic Scoring (always runs)

Each available volunteer is scored in real time using three factors:

```
Match Score = Distance Score + Skill Score + Trust Score

Distance Score (max 35):
  ≤ 2 km   → 35 pts
  ≤ 5 km   → 26 pts
  ≤ 10 km  → 18 pts
  ≤ 20 km  → 10 pts
  > 20 km  →  4 pts

Skill Score (max 30):
  Each category maps to required skills (e.g. "disaster" → rescue, logistics, medical)
  +8 pts per skill overlap with volunteer's declared skills

Trust Score (max ~40):
  trust_score (0–10) × 4
```

#### Layer 2 — Gemini 1.5 Flash AI (runs when API key is valid)

When AI is available, the system sends the emergency description and volunteer list to Gemini, which:
- **Interprets context** beyond keywords (e.g. "flood, elderly need evacuation" → prioritises medical + rescue skills)
- **Adjusts priority** if the free-text description sounds more urgent than the declared urgency level
- **Returns ranked scores** (`0.0 → 1.0`) per volunteer with a reasoning string
- **Generates a personalised mission brief** for each dispatched volunteer

AI results override the algorithmic scores. If the AI call fails or times out (5s hard limit), the system **falls back gracefully** to algorithmic scoring — zero downtime.

### Decision Factors Summary

| Factor | Weight | Source |
|--------|--------|--------|
| GPS distance to incident | High (35 pts) | Haversine formula on real coordinates |
| Skill-to-category match | High (30 pts) | Volunteer profile vs. category skill map |
| Trust score | Medium (~40 pts) | Earned through completed tasks + ratings |
| AI semantic analysis | Override layer | Gemini 1.5 Flash (context-aware) |
| Availability status | Hard filter | `available: true` required |

### Escalation Engine

If assigned volunteers don't accept within **5 minutes**:
1. Their slot is released and `available: true` is restored
2. A new dispatch wave is triggered for a **larger pool** (over-provisioning)
3. If the total acceptance window exceeds **10 minutes** with no NGO response, the system **globally auto-assigns** by bypassing NGO membership and directly selecting the best available volunteers by distance + trust score

---

## ⚡ Real-Time Capabilities

| Feature | Implementation |
|---------|---------------|
| Live request status updates | Firestore `onSnapshot` on `emergency_requests` |
| Volunteer availability feed | `onSnapshot` on `volunteers` collection |
| In-app notification feed | `onSnapshot` on `notifications` (filtered by `user_id`) |
| Team monitor (NGO) | `onSnapshot` on `assignments` subcollection |
| Chat messages | `onSnapshot` on per-request `messages` subcollection |
| Map location updates | Periodic geolocation API → Firestore write |

All listeners are cleaned up on component unmount to prevent memory leaks.

---

## 🚀 Key Innovations

1. **Per-volunteer assignment isolation** — Each volunteer has their own `assignments` subdocument, so one volunteer's acceptance or refusal doesn't affect others' states.

2. **Dual-engine matching** — Algorithmic scoring always runs; Gemini AI augments it when available. No dependency on AI for core functionality.

3. **Client-side escalation engine** — The 10-minute timeout runs via Firestore transactions on the Spark (free) plan — no Cloud Functions billing required. Cloud Functions code exists and is ready to swap in on Blaze upgrade.

4. **Role-aware data isolation** — Firestore security rules enforce that citizens only see their own completed tasks, volunteers only see their assignments, and NGOs only see requests relevant to them.

5. **Bilingual (EN/HI)** — 800+ strings fully translated into Hindi via a custom i18n engine — critical for Indian local users in disaster zones.

6. **Trust + Badge system** — Volunteers build reputation through task completion, response time, and geographic diversity. Badges incentivise consistent engagement beyond one-time help.

7. **Priority zone analytics** — NGO analytics engine calculates a weighted `priorityScore` per geographic zone:  
   `urgency weight × 40 + total reports × 30 + recent reports × 20 + category severity × 10`

---

## ⚠️ Current Limitations

| Limitation | Details |
|------------|---------|
| **No push notifications** | In-app only; volunteers must have the app open to receive assignments. No FCM/APNs integration yet. |
| **Client-side escalation** | The 10-minute timer relies on the client being online. If all users close the app, the timer pauses. (Cloud Functions code is ready; requires Firebase Blaze plan.) |
| **Volunteer write rule is broad** | On the Spark plan, the Firestore rule allows any authenticated user to update volunteer documents — needed for the client-side assignment engine. This is explicitly noted for tightening on Blaze + Admin SDK. |
| **No offline support** | Firestore offline persistence is not enabled; the app requires a network connection. |
| **Single region** | Cloud Functions are configured for `us-central1`; not multi-region. |
| **No native mobile app** | Web-only (PWA-capable but not published to app stores). |
| **AI API key client-side** | Gemini API key is exposed in the frontend bundle (via Vite env). For production, this call should move to a backend proxy. |

---

## 🗺️ Future Roadmap

| Priority | Feature |
|----------|---------|
| 🔴 High | FCM push notifications so volunteers get assignments even with the app closed |
| 🔴 High | Upgrade to Firebase Blaze + deploy Cloud Functions for server-side escalation timers |
| 🔴 High | Move Gemini API calls to a backend proxy to protect the API key |
| 🟡 Medium | Firestore offline persistence for field volunteers in low-connectivity zones |
| 🟡 Medium | Native Android/iOS app via React Native or a Capacitor wrapper |
| 🟡 Medium | Admin dashboard for platform-level moderation and analytics |
| 🟡 Medium | Multi-language support beyond Hindi (regional Indian languages) |
| 🟢 Low | SOS one-tap button on the landing page with auto-detected location |
| 🟢 Low | Integration with government disaster APIs for pre-populated emergency alerts |
| 🟢 Low | Volunteer scheduling and shift management for NGOs |

---

## ⚙️ Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) (recommended) or npm
- A [Firebase](https://firebase.google.com/) project with **Firestore**, **Authentication**, and **Storage** enabled
- A [Google Gemini API key](https://ai.google.dev/) (optional — app works without it)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ResQLink-App.git
cd ResQLink-App/resqlink-analyzer-buddy-main-2
```

### 2. Install Dependencies

```bash
bun install
# or
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional — AI features degrade gracefully if missing
VITE_GEMINI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXX

# Optional — for map features
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. Set Up Firestore Security Rules

In the Firebase Console → Firestore → Rules, paste the contents of [`firestore.rules`](./firestore.rules).

### 5. Run Locally

```bash
bun run dev
# or
npm run dev
```

App runs at `http://localhost:5173`

### 6. Build for Production

```bash
bun run build
```

Output is in the `dist/` folder, ready to deploy to GitHub Pages, Firebase Hosting, or any static host.

### 7. (Optional) Deploy Cloud Functions

> Requires Firebase Blaze plan.

```bash
cd functions
npm install
firebase login
firebase use your-project-id
firebase deploy --only functions
```

---

## 🔐 Security Considerations

| Area | Implementation |
|------|---------------|
| **Authentication** | All routes require Firebase Auth. Unauthenticated users cannot read or write any Firestore data. |
| **Data ownership** | Citizens can only update their own requests. Volunteers can only delete their own profiles. NGOs can only update their own NGO document. |
| **Assignment subcollection** | Per-volunteer `assignments` are readable by all authenticated users but writable only by the assignment engine and the volunteer themselves. |
| **Misuse reports** | `request_reports` collection is write-only for authenticated users; readable only via Firebase Console by admins. |
| **API keys** | Firebase keys are restricted on the Google Cloud Console by HTTP referrer. Gemini key is environment-injected and not hardcoded. |
| **Known gap** | Gemini API key is currently in the Vite bundle (client visible). Planned fix: move to a Cloud Function proxy. |
| **Volunteer writes** | Deliberately relaxed on Spark plan (any authenticated user can update volunteers for the assignment engine). Will be locked to Admin SDK on Blaze upgrade. |

---

## 📸 Screenshots / Demo

> Live demo and screenshots coming soon.

| Screen | Description |
|--------|-------------|
| Landing Page | Role selection for Citizen / Volunteer / NGO |
| Emergency Form | Category-specific structured intake form |
| Volunteer Dashboard | Mission inbox, acceptance timer, GPS navigation |
| NGO Control Center | Full-stack coordination panel with live map |
| Analytics | Priority zone heat map + trend charts |
| Rewards | Badge showcase + trust score progression |

---

## 👤 Author

**Rohan Prakash Banakar**  
Full-Stack Developer · Product Builder  

- GitHub: [@rohanprakashbanakar](https://github.com/rohanprakashbanakar)

---

## 🌍 Vision & Impact Statement

Every minute of delayed emergency response has a cost — in suffering, in damage, in lives.

ResQLink was built on the belief that the gap between help and need is not a problem of people — there are always willing citizens, dedicated volunteers, and committed NGOs. The gap is **coordination**. It is the chaos of unstructured communication, the friction of not knowing who is near, what skills they have, or whether they took the mission.

By treating emergency coordination as a **software problem** — one solvable with real-time databases, geospatial algorithms, and AI — ResQLink turns fragmented good intentions into a coherent, trackable, equitable response system.

The vision is a platform where any person in distress, anywhere, can receive a coordinated team at their door within minutes — not because government or large institutions alone made it happen, but because the community showed up, organised by technology.

**This is not just a hackathon project. It is infrastructure for the next disaster.**

---

<div align="center">

*Built with ❤️ for the people who show up when it matters.*

</div>
