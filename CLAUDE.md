# Cadence — CLAUDE.md

## What is Cadence
CRC Operating System that prevents clinical trial patient dropout by preserving institutional knowledge and predicting risk. Built by Ajinkya (CEO, MPH at Columbia, ex-CRC at VA Long Beach) and Sai (co-founder).

## Business Context
- $20B/year problem: 30% of clinical trial patients drop out
- 25% annual CRC turnover means institutional knowledge walks out the door
- Beachhead: sell to sites at $1,500/month (foot in the door, data acquisition)
- Real revenue play: sponsors pay for cross-site aggregated retention intelligence
- 3 pilot sites interested, YC W26 application submitted
- IQVIA is building agentic AI for sponsors/CRAs — we build for the CRC at the site level. Complementary, not competitive.

## Architecture

PRESENTATION LAYER (swappable)
  v1: React web dashboard — current
  v2: Desktop copilot (Electron/Tauri) — future
  v3: Mobile (React Native) — future

AGENT CORE (the brain)
  Planner → Executor → Actions
  LLM-agnostic (Claude / OpenAI, swap via env var)
  Cost tracking per request

KNOWLEDGE GRAPH (three tiers)
  Tier 1: Base knowledge (ships with Cadence, clinical trial fundamentals)
  Tier 2: Site knowledge (grows as CRCs use the product)
  Tier 3: Cross-site intelligence (aggregated patterns, sponsor-facing moat)

ACTION LAYER (swappable)
  v1: Database queries — current
  v2: Desktop control (screen automation) — future
  v3: CTMS APIs (Medidata, Veeva) — future

## Tech Stack
- Frontend: React 18 + Tailwind CSS + Vite, deployed on Vercel (migrating to AWS Amplify)
- Backend: Python 3.11 + FastAPI, will deploy on AWS Lambda + API Gateway
- Database: In-memory seed data (migrating to Neon Postgres, then AWS RDS at scale)
- Auth: JWT (PyJWT) with role-based access, migrating to AWS Cognito (HIPAA eligible)
- LLM: Claude API (Anthropic) or OpenAI, swappable via LLM_PROVIDER and LLM_MODEL env vars
- Cost tracking built into LLM layer at /api/usage

## Branch Structure
- master: demo dashboard (Sai works here)
- v2-agent: production product (Ajinkya works here) — THIS BRANCH

## Multi-Site Data Model (CRITICAL)
Every record in the system has site_id and organization_id. A CRC only sees their own site's data. Sponsors/admins can see cross-site. This is enforced server-side, not just UI.

Sites in seed data:
- Columbia University Medical Center
- VA Long Beach Healthcare System
- Mount Sinai Hospital

Trials can span multiple sites (same trial_id, different site_id).

## File Structure

### Backend (backend/)
- main.py — FastAPI app, all endpoints, CORS, lifespan startup
- agent/
  - llm.py — LLM abstraction layer (ClaudeProvider, OpenAIProvider, UsageTracker, cost tracking)
  - planner.py — Converts CRC natural language → structured action plans via LLM
  - executor.py — Orchestrates plan → action execution → formatted response
  - actions/
    - base.py — Abstract ActionProvider interface and ActionType enum (21 action types)
    - database.py — DatabaseActionProvider (v1: all actions resolve to DB queries, includes create_task, add_site_knowledge, resolve_patient, staff workload)
    - tasks.py — TaskManager (auto-generates and manages CRC tasks)
    - monitoring.py — MonitoringPrepManager (monitoring visit prep checklists)
    - handoff.py — HandoffGenerator (compiles site briefing for new CRCs, includes team section)
    - staff.py — StaffManager (8 seed staff across 3 sites, patient/task assignment, workload tracking)
  - patient_resolver.py — Fuzzy patient matching (exact ID → partial ID → name → contextual filters)
- knowledge/
  - base_knowledge.py — Tier 1: foundational clinical trial knowledge (55 entries)
  - site_knowledge.py — Tier 2: site-specific institutional knowledge (35 seed entries)
  - cross_site.py — Tier 3: aggregated patterns across sites (12 entries)
  - retrieval.py — Unified search across all three tiers with tier weighting
  - lifecycle.py — Entry status management (active/stale/draft/archived), validation, archival
  - pattern_detector.py — Analyzes intervention outcomes, generates knowledge suggestions
- data/
  - seed.py — Fake patient/trial/site data generator
- auth.py — JWT auth, user model, role-based access

### Frontend (frontend/src/)
- App.jsx — Root with state-based routing, dataVersion counter for cross-component refresh
- components/
  - layout/AppLayout.jsx — Sidebar nav + top bar + login form + admin nav (role-gated)
  - chat/CadenceChat.jsx — Agent chat interface, triggers onDataChange on side effects
  - calendar/TaskCalendar.jsx — Week/day view task calendar, staff filter, refetches on dataVersion
  - patients/PatientRegistry.jsx — Patient table with CRC column, staff filter, reassign, refetches on dataVersion
  - protocols/ProtocolManager.jsx — Upload and search protocols
  - monitoring/MonitoringPrep.jsx — Monitoring visit prep checklists
  - analytics/SiteAnalytics.jsx — Retention stats, cross-site comparison
  - handoff/HandoffView.jsx — New CRC briefing document + Q&A
  - knowledge/KnowledgeBase.jsx — Browse/add/search three-tier knowledge (Promise.allSettled for resilience)
  - staff/StaffDirectory.jsx — Team workload overview, expandable cards with patients/tasks
  - admin/AdminPanel.jsx — Admin panel with Overview, Sites, Users, Trials sub-tabs (lazy-loaded)
  - onboarding/
    - tabConfigs.js — Per-tab onboarding config (title, description, customization fields)
    - TabOnboarding.jsx — Reusable tab-level onboarding overlay with dynamic field rendering
    - SiteSetupWizard.jsx — 5-step wizard for new sites (0 patients)
    - NewCRCWelcome.jsx — 5-step welcome for new CRCs (handoff briefing, patients, calendar, chat)
- api/client.js — Centralized API client with JWT headers

## Design Conventions
- Palette: slate/blue (slate-50 bg, slate-200 borders, blue-500/600 accents)
- Font: DM Sans
- Components: white bg, border-slate-200, rounded-lg or rounded-xl, hover:border-slate-300
- Status colors: red = urgent/overdue, amber = attention, green = good, blue = in progress
- Risk indicators: red high (>=0.7), yellow medium (0.4-0.7), green low (<0.4)

## Key Design Decisions
- LLM-agnostic: swap Claude/OpenAI with env vars, cost tracking automatic
- Action system is pluggable: same interface for DB queries now, desktop control later
- Multi-site from day one: every record has site_id, scoped by JWT
- Knowledge graph has 3 tiers: base → site → cross-site
- Auth: JWT with site_id and role baked in, enforced server-side

## API Endpoints
- POST /api/chat — Main agent chat
- POST /api/chat/reset — Reset conversation
- GET /api/patients — List patients (filterable by site_id, trial_id, status, risk_level)
- GET /api/patients/{id} — Patient details
- GET /api/patients/{id}/summary — Compact patient card
- POST /api/patients/{id}/note — Add CRC note
- GET /api/trials — Trial list
- GET /api/tasks — Task list (filterable by site_id, date range, status)
- POST /api/tasks — Create manual task
- PATCH /api/tasks/{id} — Complete/snooze/update task
- GET /api/tasks/today — Today's tasks
- POST /api/protocols/upload — Upload protocol text
- GET /api/protocols — List protocols
- POST /api/protocols/search — Search protocol content
- GET /api/monitoring — List monitoring visits
- POST /api/monitoring — Schedule monitoring visit
- GET /api/monitoring/{id}/prep — Auto-generated prep checklist
- POST /api/interventions — Log intervention
- GET /api/interventions — List interventions
- GET /api/interventions/stats — Intervention effectiveness
- GET /api/queries — Data queries
- GET /api/analytics/site/{site_id} — Site analytics
- GET /api/analytics/cross-site — Aggregated analytics
- GET /api/handoff/{site_id} — Generate handoff report
- POST /api/auth/login — Login
- GET /api/auth/me — Current user
- GET /api/knowledge — List knowledge entries (filterable by tier, site_id, category)
- GET /api/knowledge/stats — Knowledge stats per tier/site/category + lifecycle
- GET /api/knowledge/search — Unified search across all tiers
- GET /api/knowledge/cross-site — Cross-site intelligence insights
- POST /api/knowledge — Add Tier 2 site-specific knowledge
- GET /api/knowledge/stale — Entries that need review
- PATCH /api/knowledge/{id}/validate — Mark entry as still valid
- PATCH /api/knowledge/{id}/archive — Archive entry
- GET /api/knowledge/suggestions — AI-generated knowledge suggestions
- POST /api/knowledge/suggestions/{id}/approve — Approve suggestion → Tier 2
- POST /api/knowledge/suggestions/{id}/dismiss — Dismiss suggestion
- GET /api/staff — List staff (filterable by site_id, role)
- GET /api/staff/{id} — Staff detail + workload
- POST /api/staff — Add staff member
- PATCH /api/staff/{id} — Update staff
- GET /api/staff/{id}/tasks — Tasks assigned to staff member
- GET /api/staff/{id}/patients — Patients assigned to staff member
- GET /api/staff/workload — Workload overview per site
- PATCH /api/tasks/{id}/assign — Reassign task to staff
- PATCH /api/patients/{id}/assign — Reassign patient primary CRC
- GET /api/usage — LLM cost tracking
- GET /api/dashboard — Summary stats
- GET /api/admin/overview — Global stats (orgs, sites, trials, patients, users, staff, tasks, knowledge, LLM cost)
- GET /api/admin/organizations — List organizations
- POST /api/admin/organizations — Create organization
- GET /api/admin/sites — List sites (enriched with patient/trial/staff/user counts)
- POST /api/admin/sites — Create site
- PATCH /api/admin/sites/{id} — Update site
- GET /api/admin/users — List users
- POST /api/admin/users — Create user
- PATCH /api/admin/users/{id} — Update user
- DELETE /api/admin/users/{id} — Soft-delete user
- GET /api/admin/trials — List trials (enriched with site count, patient count, enrollments)
- POST /api/admin/trials — Create trial
- POST /api/admin/sites/{site_id}/trials — Enroll trial at site
- DELETE /api/admin/sites/{site_id}/trials/{trial_id} — Remove trial enrollment
- GET /api/preferences/me — Current user's tab preferences + onboarding state
- PATCH /api/preferences/me/{tab} — Update preferences for a specific tab
- PATCH /api/preferences/me/first-login-complete — Mark first login complete

## Infrastructure Plan (not yet implemented)
- Database: Neon Postgres (free tier) → AWS RDS at scale
- Backend: AWS Lambda + API Gateway
- Frontend: AWS Amplify
- Auth: AWS Cognito (HIPAA eligible)
- Target: $0-20/month at current stage

## What's Next
- Patient CSV import tool (for pilot onboarding)
- Deploy to AWS
- First pilot site conversations

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. Plan First: Write plan to tasks/todo.md with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. Explain Changes: High-level summary at each step
5. Document Results: Add review section to tasks/todo.md
6. Capture Lessons: Update tasks/lessons.md after corrections

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what's necessary. Avoid introducing bugs.

## Session Log
Track what was built each session so context carries over. Update this at the end of every session.

### Session 1 — Initial Scaffold
- Built agent core, LLM abstraction, pluggable action system, chat UI, fake patient data

### Session 2 — Full Feature Build
- Multi-site seed data, task calendar, protocol drop zone, patient registry, monitoring visit prep, intervention tracker, data query log, analytics dashboard, CRC handoff, sidebar navigation

### Session 3 — Knowledge Graph
- Three-tier knowledge architecture, unified retrieval, knowledge base UI, wired into agent planner

### Session 4 — Auth & Landing
- JWT auth, login page, landing page, request access form, site-scoped access, role-based views

### Session 5 — Chat→Task/Knowledge + Knowledge Lifecycle
- Agent actions: create_task (CRC says "remind me to call X tomorrow" → task created), add_site_knowledge (CRC shares operational knowledge → saved to Tier 2)
- Knowledge lifecycle: status fields (active/stale/draft/archived), staleness detection, validation/archival endpoints
- Pattern detector: analyzes intervention outcomes, generates 6 seed AI suggestions (2 per site), approve/dismiss flow
- KnowledgeBase.jsx: "Suggested Insights" section, "Needs Review" section, status badges, reference counts, confidence indicators
- CadenceChat.jsx: toast notifications when agent creates tasks or saves knowledge from conversation
- 6 new API endpoints for lifecycle management (stale, validate, archive, suggestions, approve, dismiss)

### Session 6 — Fuzzy Patient Matching + Staff Management + Bug Fixes
- PatientResolver: fuzzy matching pipeline (exact ID → partial ID → name → contextual filters like trial/risk/status)
- StaffManager: 8 seed staff across 3 sites (Columbia 3, VA 3, Sinai 2), auto-assigns patients/tasks by trial specialty
- Agent integration: resolve_patient, get_staff_workload, reassign_patient actions; executor stores resolved patients in conversation memory
- Planner updates: natural language patient references ("call Maria"), staff workload queries
- Handoff integration: team section with staff workload in briefing docs
- StaffDirectory.jsx: Team tab with workload bars, expandable cards showing patients/tasks, capacity recommendations
- TaskCalendar.jsx: staff filter dropdown, staff initials on task cards
- PatientRegistry.jsx: Primary CRC column, staff filter pills, inline reassign form
- 9 new API endpoints for staff management
- Bug fix: cross-component refresh via dataVersion counter (chat creates task → calendar/patients refetch)
- Bug fix: KnowledgeBase.jsx uses Promise.allSettled for resilience (partial failures don't break the page)
- Bug fix: created frontend/.env for API URL (was missing, causing 404s without Vite proxy)

### Session 7 — Honesty Pass + Admin Panel
- Honesty pass: _send_reminder returns queued (not sent), _schedule_visit returns logged (not scheduled), pattern_detector seeds marked as seed_data with ui_note, planner system prompt has "WHAT YOU CAN DO" / "WHAT YOU CANNOT DO YET" sections
- Auth system: backend/auth.py with JWT (PyJWT), in-memory user store, 4 seed users, role-based access
- Admin panel: AdminPanel.jsx with Overview, Sites, Users, Trials sub-tabs (lazy-loaded)
- Admin endpoints: 16 new /api/admin/* routes, all gated by require_admin dependency
- AppLayout: inline login form, admin nav item visible only for admin/sponsor roles
- Non-invasive: existing CRC endpoints stay public, auth only enforced on admin routes
- Bug fix: TaskCalendar week view missing staffLookup prop on TaskCard

### Session 8 — Onboarding System
- Site Setup Wizard: 5-step wizard for new sites (0 patients) — welcome, trials, patients, protocol upload, completion
- New CRC Welcome: 5-step welcome for first-time logins — handoff briefing, patients, calendar, chat suggestions
- Tab-level onboarding: reusable overlay with per-tab customization fields (select, checkbox_group, number, text_list)
- Tab configs: 10 tabs configured with title, description, and customization options (calendar, patients, monitoring, analytics, knowledge have prefs)
- Preferences API: 3 new endpoints (GET/PATCH preferences/me, first-login-complete), user model extended with first_login, preferences, onboarded_tabs
- Preference wiring: TaskCalendar (default_view), PatientRegistry (default_sort, needs_contact_days), SiteAnalytics (visible_cards), MonitoringPrep and KnowledgeBase accept preferences prop
- All preferences have sensible defaults — app works identically without any customization
