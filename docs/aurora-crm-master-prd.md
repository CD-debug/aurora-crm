# MASTER PROMPT (Instructions for AI — not part of PRD word count)

You are acting as a **Senior Product Manager and Technical Architect** with deep expertise in CRM platforms, SaaS product design, and the timeshare/fractional-ownership exit industry. You are producing a **Product Requirements Document (PRD)** for a real software build that will be handed directly to designers and engineers.

Your role in reading this document:
- Treat every section below as an approved requirement, not a suggestion, unless explicitly marked "recommended" or "optional."
- Where the document says "recommended," treat it as included in scope unless the reader tells you otherwise.
- Maintain the zero-paid-subscription constraint as a hard architectural boundary in any technical recommendations you make from this document going forward.
- Do not simplify, remove, or water down any stated feature when using this document to generate designs, code, tickets, or further documentation.
- If asked to build from this PRD, decompose it into epics and tickets by section (Dashboard, Clients, Client 360, Tasks) and preserve every listed field, statistic, and behavior.
- This PRD reflects an evolving product; if new information is provided by the product owner in the future, integrate it additively without deleting existing approved scope unless explicitly told to.
- This version of the PRD is optimized as a direct implementation blueprint. The Navigation & Cross-Page Interaction Architecture section and the Data Model & Schema Detail section are normative specifications, not illustrative examples — route paths, field names, types, and the cache-invalidation/sync strategy described there should be implemented as written unless a stated open question marks them undecided.
- The UI/UX Design System section defines the required visual language (color tokens, typography roles, the "Aurora Arc" signature motif, and component-to-shadcn/ui mapping) for every surface described later in the document. Apply it consistently rather than defaulting to generic component styling or unrelated visual choices.
- When scaffolding the Next.js application, use the suggested project structure in the Technical Foundation section as the starting file/folder layout unless the reader specifies otherwise.
- Where this document lists an illustrative option (for example, a chart library for future dashboard visualizations) rather than a final decision, treat it as a strong recommendation to propose to the reader, not a silently finalized choice — these are flagged explicitly wherever they appear. The core platform stack — GitHub, Supabase, Vercel, Next.js, shadcn/ui — is fixed and non-negotiable, not illustrative; do not propose alternatives to it.
- This revision scopes Aurora as a single-user application for the initial build, with multi-user support planned as an explicit later phase (Section 16, Phase 4). Build accordingly: don't add role/permission complexity now, but don't paint the data model or auth layer into a corner either — the schema and security policies in Sections 5.1, 5.2, and 13 are written to make that later expansion additive.

---

# Aurora CRM — Product Requirements Document

## 1. Executive Summary

Aurora is a purpose-built customer relationship management platform designed specifically for the fractional property ownership and timeshare exit industry. It is being developed for eventual acquisition by Consumer Attorney Network, positioning Aurora not merely as an internal operations tool but as a scalable, industry-defining product with commercial resale value. Aurora is the first CRM of its kind engineered from the ground up around the specific operational realities of timeshare cancellation casework: multi-stage client journeys, property-level financial tracking, maintenance fee monitoring, and document-heavy case progression.

The platform is built on a fixed, non-negotiable technology stack — GitHub, Supabase, Vercel, Next.js, and shadcn/ui (with Tailwind CSS as its underlying styling foundation) — with an explicit constraint that every one of these services is used strictly within its free tier, and no component of the system may require a paid subscription or licensed third-party service beyond them. This constraint shapes every architectural and feature decision throughout this document, and is treated as a permanent product principle rather than a temporary budget limitation.

Aurora is also being built, in this phase, as a **single-user application** — one owner-operator account handling the full caseload — with multi-user support planned as a deliberate later phase once this MVP is complete and tested (Section 16, Phase 4). This keeps the initial build focused while the data model and security layer are designed from day one so that expansion is additive rather than a rewrite.

Aurora's competitive benchmark is Wesley Financial Group, the largest and most established timeshare cancellation company in the United States. Wesley's public-facing brand emphasizes trust, transparency, and results at scale — over $725 million saved in timeshare debt relief, more than 50,000 families served, and a clearly communicated four-stage client journey (Share Your Story, Get Your Exit Plan, The Fight Begins, Timeshare Freedom). Aurora's objective is to internalize and operationalize this level of case clarity and client trust into a live, real-time software system, rather than a marketing website. Where Wesley communicates aggregate impact to prospective clients, Aurora must compute and surface that same caliber of impact metrics — down to the individual case level — for the internal team managing the caseload daily.

Aurora is structured around four core surfaces: an Overview/Metrics Dashboard, a Clients directory, a Client 360 workspace (the primary daily-use screen), and a Tasks page for scheduling and follow-up management. These four surfaces are deeply interconnected: tasks created inside a Client 360 record automatically populate the Tasks page, client health statistics roll up into the portfolio-level dashboard, and a persistent global search allows any team member to reach any client's full case record within seconds. This revision of the PRD formalizes exactly how that interconnection works — the precise navigation contracts, data-sync mechanics, and shared visual language that make the four surfaces feel like one continuous product rather than four separate tools — so that it can be implemented consistently rather than left to interpretation.

## 2. Product Vision & Goals

The vision for Aurora is to become the operating system for timeshare exit casework — a single source of truth that replaces spreadsheets, generic CRMs, and disconnected note-taking tools with a purpose-fit system that understands the specific shape of this business: multi-year cases, property-level debt tracking, and communication-heavy client relationships.

Primary goals:

1. **Centralize case management.** Every client, every property, every note, and every task lives in one connected system, accessible in seconds via global search.
2. **Make case progress visible at a glance.** Both at the individual client level (Client 360) and at the portfolio level (Overview Dashboard), staff should never have to dig for status.
3. **Operationalize the client journey.** The four-stage Wesley-style journey becomes a first-class data structure in Aurora, not just a marketing narrative — every case has a stage, a stage duration, and a next action.
4. **Zero ongoing software cost.** Every capability in this document must be achievable on the required stack — GitHub, Supabase, Vercel, Next.js, shadcn/ui — using only their free tiers, indefinitely, to maximize margin and acquisition value.
5. **Be acquisition-ready.** Because Aurora is being built with the intent of purchase by Consumer Attorney Network, the platform must be clean, well-documented, and structured for handoff — not a scrappy internal tool, but a defensible product asset.
6. **Make the connections feel seamless.** Moving from a client search, to their case detail, to their pipeline stage, to their tasks should feel like navigating one continuous workspace — not four separate tools stitched together. This goal is directly implemented in Section 7 (Navigation & Cross-Page Interaction Architecture) and Section 8 (UI/UX Design System).
7. **Start single-user, expand deliberately.** Prove the core workflows with one owner-operator account before investing in multi-user roles and permissions, so complexity is added only once the fundamentals are validated.

## 3. Target Users

Aurora's primary users are internal case management and client success staff at a timeshare exit company (or a legal/consumer advocacy firm operating in this space, per Consumer Attorney Network's positioning). **In this phase, Aurora is single-user**: one owner-operator account is provisioned, and that person wears every hat below. The roles are still documented individually because they represent real, separable workflows — and the seams along which the system will eventually split into distinct accounts once multi-user support ships (Section 16, Phase 4) — not because multiple simultaneous users exist today.

- **Case Manager / Client Success** function — the heaviest daily use, centered on the Client 360 page: logging notes, updating case stage, and managing tasks.
- **Sales / Intake** function — primary use of the Clients page for onboarding and initial data entry.
- **Leadership / Operations** function — primary use of the Overview Dashboard for portfolio-level visibility into sales, completion rates, and business performance.
- **Future external stakeholders** (post-acquisition) — Consumer Attorney Network leadership evaluating aggregate performance metrics as part of ownership or reporting requirements, once multi-user access is introduced.

## 4. Competitive Context: Wesley Financial Group Benchmark

Wesley Financial Group operates as the industry's most visible and trusted timeshare cancellation brand. Their public messaging is built around a small number of powerful, aggregate proof points: total dollars saved, number of families helped, number of 5-star reviews, years in business, and headcount. Their operational narrative is condensed into four stages that a prospective client can understand instantly.

For Aurora, this translates into two concrete product requirements:

First, the **Overview Dashboard must be able to produce Wesley-caliber aggregate metrics natively**, computed from live case data rather than manually compiled for marketing purposes. Total debt eliminated, total families/clients served, current active caseload, and resolution rate should all be available as real, queryable numbers at any moment — not once-a-year statistics.

Second, the **Client 360 page must operationalize the four-stage journey** (Consultation, Exit Plan, In Progress/The Fight, Resolved/Freedom) as a structured, trackable pipeline field on every single case, with associated timestamps, so that "how long has this client been in this stage" and "what's the next action" are always immediately answerable — something a public marketing site cannot offer, but which is the actual daily operational need behind that public narrative.

Aurora's differentiation from Wesley is not in the client-facing story — it's in giving the internal team dramatically more visibility, structure, and speed than an outside observer could ever infer from a company website. Where Wesley shows the result, Aurora manages the process.

## 5. Technical Foundation & Constraints

Aurora is built on a fixed, non-negotiable technology stack:

- **Framework:** Next.js — chosen for its combination of server-side rendering, API routes, and seamless Vercel deployment, allowing Aurora to function as a full-stack application without a separate backend service.
- **Styling:** Tailwind CSS — the utility-first styling layer shadcn/ui itself is built on; required as a structural dependency of the component library below, not an independent choice.
- **Component Library:** shadcn/ui (and compatible open-source libraries in the same ecosystem) — provides accessible, pre-built components (dialogs, dropdowns, calendars, badges, tables) that can be fully owned and customized in-code rather than imported as a paid dependency.
- **Database, Auth & Storage:** Supabase — a hosted Postgres database with built-in authentication and file storage, used entirely on its free tier. Supabase resolves what was previously an open question (Section 17) around database and auth selection with one platform instead of two separate services.
- **Version Control:** GitHub — source of truth for all code, enabling collaboration, history, and CI/CD triggers.
- **Hosting/Deployment:** Vercel — free-tier deployment directly from GitHub, with automatic preview deployments per branch/PR.

These five pieces — GitHub, Supabase, Vercel, Next.js, and shadcn/ui — are must-haves for this build and are not to be substituted, even if an alternative seems technically preferable. Any future recommendation should work within this stack rather than around it.

**Hard constraint:** No feature in this PRD may require a paid subscription, licensed API, or metered third-party service to function. Every service in the required stack above must be used strictly within its free tier. Supabase in particular has real free-tier limits worth designing around rather than discovering after launch — roughly 500MB of database storage, 1GB of file storage, and free projects that auto-pause after about a week with no incoming requests; see Section 17 for how the pause risk is mitigated. This constraint is treated as a permanent design principle, not a temporary limitation — it directly supports Aurora's positioning as a low-overhead, high-margin, acquisition-ready product.

### 5.1 Data & Sync Layer

To make the cross-page connectivity described in Section 7 work smoothly without any paid real-time infrastructure, Aurora's data layer combines three free mechanisms, all built around the required Supabase platform:

- **Client-side cache and state:** TanStack Query (`@tanstack/react-query`), a free, MIT-licensed library, manages client-side data fetching and caching using shared query keys per entity (for example, a `tasks` key, optionally scoped by `clientId`). When a task, note, or property is created or edited anywhere in the app, the relevant query key is invalidated, and any other open view reading that same data refetches automatically.
- **Server-side mutations and revalidation:** Next.js Server Actions handle writes (creating a task, advancing a pipeline stage, marking a property paid off) by calling the Supabase client against Postgres, paired with Next.js's built-in `revalidatePath`/`revalidateTag` functions to keep server-rendered pages — particularly the Dashboard's aggregate metrics — accurate immediately after a change, without a separate reporting or ETL process.
- **Row-Level Security (RLS):** Supabase's built-in Postgres RLS is enabled on every table from the very first migration, even in the single-user MVP, with a simple policy scoped to the one owner's user ID. This costs nothing extra to set up now and means the Phase 4 multi-user expansion only requires adding new policies (for example, "a rep can see clients assigned to them"), not retrofitting security onto a previously wide-open database.

This combination gives Aurora the *feel* of a real-time, always-in-sync application while remaining entirely within the required, free-tier Supabase platform.

### 5.2 Decided Services (Supabase Platform)

These are now settled decisions, not candidates — they resolve what was previously an open question in Section 17:

- **Authentication:** Supabase Auth, used on its free tier. For this phase, exactly one account is provisioned (the single owner-operator); no role or permission logic is built yet, since there's only one user to authorize.
- **Database:** Supabase Postgres, on its free tier. Foreign-key relationships (Client → Property, Note, Task) are enforced at the database level, matching the schema in Section 13. RLS policies (Section 5.1) provide row-level access control from the start.
- **File/document storage (if needed beyond a reference link):** Supabase Storage, on its free tier, is available for the document/contract reference field in Section 11.2 if the product owner later decides real file hosting is needed rather than a link-only reference; see Section 17.
- **ORM / type safety:** either Supabase's own generated TypeScript types (`supabase gen types typescript`, generated directly from the live schema at no cost) used with the `@supabase/supabase-js` client, or Drizzle ORM layered on top for more code-first schema control. Both are free and compatible with Supabase Postgres; the choice between them is a developer-experience preference, not a cost or capability tradeoff.

### 5.3 Suggested Project Structure

The following illustrative Next.js App Router structure keeps each surface from this PRD cleanly separated while sharing common data-access and UI code:

```
app/
  (dashboard)/
    page.tsx                  # Overview / Metrics Dashboard (Section 9)
  clients/
    page.tsx                  # Clients directory (Section 10)
    [clientId]/
      page.tsx                # Client 360 (Section 11)
  tasks/
    page.tsx                  # Tasks page (Section 12)
components/
  dashboard/                  # metric cards, aggregate charts
  clients/                    # client table, health badge, filters
  client-360/                 # pipeline stepper, property list, notes, task panel
  tasks/                      # calendar, task list, right-side panel
  shared/                     # global search / command palette, nav rail, breadcrumb
  ui/                         # shadcn/ui primitives
lib/
  supabase/
    client.ts                 # browser Supabase client
    server.ts                 # server-side Supabase client (Server Actions, Server Components)
  data/                       # data-access functions, TanStack Query key definitions
  types/                      # shared TypeScript types and enums (Section 13)
supabase/
  migrations/                 # versioned schema migrations (Supabase CLI)
.env.local                    # Supabase project URL + anon key (never committed)
```

This structure is a starting point rather than a rigid requirement, but is recommended as the default scaffold for any implementation generated from this PRD.

## 6. Information Architecture & Route Map

Aurora consists of four primary surfaces, connected by a persistent global search:

1. Overview / Metrics Dashboard (landing page)
2. Clients Page (directory)
3. Client 360 (per-client workspace — the primary daily-use screen)
4. Tasks Page (cross-client scheduling and follow-up management)

A **global search field**, fixed to the top-left of the interface across all pages, allows any user to type a client name and be routed directly to that client's Client 360 page. This is treated as core navigation infrastructure, not a page-specific feature. Its full interaction behavior is specified in Section 7.1.

| Surface | Route | Notes |
|---|---|---|
| Overview Dashboard | `/` | Landing page immediately after login |
| Clients Directory | `/clients` | Filter/sort state reflected in URL query params, e.g. `/clients?health=at-risk&state=FL` |
| Client 360 | `/clients/[clientId]` | Primary workspace; all sub-sections (statistics, properties, notes, tasks) live on one scrollable page rather than separate routes or tabs |
| Tasks Page | `/tasks` | Filter state reflected in URL query params, e.g. `/tasks?client=[clientId]&status=overdue` |

Keeping Client 360 as a single page (rather than splitting statistics, properties, notes, and tasks into separate tabs or routes) is a deliberate choice that reflects the original requirement that this page function as the team's main working surface, where "every statistic," notes, and tasks are visible together without additional clicks.

Every route in the table above sits behind Supabase Auth (Section 5.2). During this single-user phase, exactly one account can sign in; the login screen itself is intentionally minimal, with no sign-up flow, since accounts are provisioned directly rather than self-served.

## 7. Navigation & Cross-Page Interaction Architecture

This section exists specifically to make the connective experience between the Clients directory, Client 360, the pipeline, and the Tasks page explicit and unambiguous, since a seamless, "perfect" connection between these surfaces is a top priority for this product. Nothing here overrides earlier sections — it specifies precisely how the behaviors already described (global search, bidirectional task sync, health status, pipeline stage) are wired together end to end.

### 7.1 Global Search / Command Palette

- Persistent, top-left, present on every surface, per Section 6.
- Opens either by clicking the field or via a keyboard shortcut (Cmd/Ctrl+K) for power users who live in the product all day.
- Implemented using shadcn/ui's `Command` component, built on the free, open-source `cmdk` library — no paid search service required.
- Live-filters the client list as the user types, matching primarily on name, with phone and email as secondary match fields so a rep can find a client from a partial phone number if needed.
- Fully keyboard-navigable: arrow keys move the selection, Enter navigates to the highlighted client, Esc closes the palette without navigating.
- Selecting a result routes directly to `/clients/[clientId]` — there is no intermediate confirmation step, since speed is the entire point of this feature.

### 7.2 Primary Click-Path Map

| From | Action | To | Resulting State |
|---|---|---|---|
| Clients directory row | Click anywhere on the row | Client 360 (`/clients/[clientId]`) | Opens at the top of the page, statistics visible immediately |
| Any page | Global search → select client | Client 360 (`/clients/[clientId]`) | Same as above |
| Client 360 | Click breadcrumb "Clients" | Clients directory (`/clients`) | Restores the filter/sort state the user had before entering Client 360 |
| Client 360 | Click a pipeline stage node | Inline confirmation panel (no navigation) | Updates stage, timestamps the transition, recalculates health flag in place |
| Client 360 | "+ Add Task" in the task panel | Inline form (no navigation) | New task appears immediately in the Client 360 task panel and is queryable from the Tasks page |
| Dashboard | Click a metric card (e.g., "At-Risk Cases") | Clients directory, pre-filtered | e.g., `/clients?health=at-risk` |
| Tasks page | Click the client name within a task row | Client 360 (`/clients/[clientId]#tasks`) | Deep-links directly to that client's Tasks & Appointments section |
| Tasks page | Click elsewhere on a task row | Row expands in place | Per Section 12.3 — no navigation occurs |

### 7.3 State Preservation & Deep Linking

Filter and sort state on the Clients directory and the Tasks page lives in the URL query string rather than only in local component state. This has two direct benefits: back-navigation from Client 360 to the Clients directory (or from a task back to the Tasks page) restores exactly the view the user left, and any filtered view — "all at-risk clients in Florida," for instance — can be bookmarked or shared with a teammate as a plain link.

Client 360 sections are individually addressable via URL anchors (for example, `/clients/[clientId]#tasks` or `/clients/[clientId]#properties`), so a link from elsewhere in the app — such as the Tasks page click-path above — can land a user precisely where they need to be on an otherwise long, single-scroll page, rather than forcing them to scroll and search manually.

### 7.4 Cross-Page Data Synchronization

All task data — whether created, edited, or completed from Client 360 or from the standalone Tasks page — reads from and writes to a single shared `Task` record, per the data model in Section 13. There is no duplicated or copied task data anywhere in the system.

Client-side, this is enforced through shared TanStack Query cache keys (Section 5.1): a mutation performed on one page invalidates the relevant cached query, so the next time either page is viewed — or, if both are open in different tabs, on their next refetch — it reflects the change automatically, with no manual refresh required, since every mutation writes through the same Supabase Postgres database regardless of which page it originated from. Server-rendered aggregate data, such as the Dashboard's portfolio-level rollups, is kept accurate through Next.js revalidation triggered by the same underlying mutations, so a completed task, an advanced pipeline stage, or a property marked paid off is reflected across the entire product within moments, without any paid real-time infrastructure.

### 7.5 Pipeline Stage Interaction

The pipeline stage stepper on Client 360 — visually implemented as the Aurora Arc described in Section 8.5 — is directly clickable. Advancing or correcting a client's stage happens inline, through the confirmation panel referenced in Section 7.2, without navigating away from the page. On confirmation: the stage-transition timestamp is recorded, which powers the "days in current stage" statistic from Section 11.1; the case health flag recalculates automatically; and the change propagates immediately to the Client 360 header, the Clients directory row for that client, and any Dashboard aggregate that depends on stage — all through the sync mechanism described in Section 7.4.

## 8. UI/UX Design System

Because the interface itself is a top priority for this product, this section defines Aurora's specific visual language — so the product feels considered and cohesive from day one rather than assembled from generic component defaults, and so that every future feature request has a clear system to extend rather than a blank slate to reinvent each time.

### 8.1 Visual Direction

Aurora's users spend their entire day managing financially stressed clients through a long, document-heavy process. The interface itself should feel calm, precise, and trustworthy — closer to a well-run legal case-management tool than a flashy sales CRM. The product's own name, combined with the industry's own end-of-process language (Wesley's "Timeshare Freedom"), suggests a natural motif: light breaking at the end of a difficult process. Aurora adopts this as its one deliberate signature element (Section 8.5) rather than a generic dashboard trope, and keeps everything else in the interface quiet and disciplined around it.

### 8.2 Color Tokens

Aurora's tokens are defined as OKLCH values in `src/app/globals.css` so the entire visual system re-themes by swapping the `:root` and `.dark` variable blocks. The semantic intent below is normative; the exact hex/OKLCH values are tuned for warm cream/sand (light) and warm charcoal (dark) palettes.

| Token | Role | Light OKLCH | Dark OKLCH |
|---|---|---|---|
| Mist (Background) | Page surface | `oklch(0.97 0.012 80)` | `oklch(0.20 0.015 70)` |
| Surface-1 (Card) | Lifted surface above page | `oklch(0.995 0.008 85)` | `oklch(0.24 0.018 70)` |
| Surface-2 (Section) | Mid-fill, section breaks | `oklch(0.95 0.018 75)` | `oklch(0.26 0.020 70)` |
| Surface-3 (Nested/hover) | Deepest neutral, hover states | `oklch(0.92 0.025 70)` | `oklch(0.30 0.022 70)` |
| Ink (Foreground) | Primary text | `oklch(0.18 0.02 255)` | `oklch(0.96 0.012 80)` |
| Fog (Border) | Borders, dividers, table lines | `oklch(0.86 0.018 75)` | `oklch(0.32 0.020 70)` |
| Horizon Teal | Primary brand accent; start of Aurora Arc | `oklch(0.56 0.18 185)` | `oklch(0.65 0.16 185)` |
| Dusk Indigo | Secondary accent; end of Aurora Arc | `oklch(0.55 0.18 280)` | `oklch(0.62 0.16 280)` |
| Risk Red | Overdue tasks, at-risk case health | `oklch(0.58 0.24 25)` | `oklch(0.65 0.22 25)` |
| Attention Amber | Due-soon tasks, stalled case health | `oklch(0.72 0.18 75)` | `oklch(0.75 0.18 75)` |
| Stable Green | On-track tasks, resolved/healthy cases | `oklch(0.55 0.15 145)` | `oklch(0.65 0.15 145)` |
| Aurora Peach | Highlight accent (stat callouts, secondary moments) | `oklch(0.78 0.12 50)` | `oklch(0.72 0.14 50)` |
| Tint Teal/Indigo/Amber/Green | Section fill tints (~10% chroma partners to the brand colors) | derived | derived |

**Hex equivalents (for cross-platform reference):**

| Token | Hex |
|---|---|
| Mist | `#F7F4ED` |
| Ink | `#1B2430` |
| Fog | `#DDD3C0` |
| Horizon Teal | `#0FA59A` |
| Dusk Indigo | `#5650C6` |
| Risk Red | `#DC2626` |
| Attention Amber | `#D97706` |
| Stable Green | `#16A34A` |
| Aurora Peach | `#E89C5E` |

### 8.3 Typography

Three type roles, all free Google Fonts with no licensing cost:

- **Display** (page titles, the Aurora wordmark): Fraunces, used sparingly and only at larger sizes, giving the product a point of character without overusing it.
- **UI/Body** (navigation, labels, notes, buttons, general text): IBM Plex Sans, chosen for its clarity and slightly technical, professional feel appropriate to a legal-adjacent operations tool.
- **Data/Utility** (dollar amounts, dates, days-in-stage counters, case identifiers): IBM Plex Mono, which gives financial figures a precise, tabular feel and keeps numeric columns cleanly aligned in dense tables — a small detail that reinforces trust every time a dollar amount appears on screen.

### 8.4 Layout Concept

- A **persistent left navigation rail** (rather than a top bar) contains the Aurora wordmark, the global search entry point (Section 7.1), and links to the Dashboard, Clients, and Tasks surfaces; it collapses to icon-only on smaller viewports.
- **Client 360** uses a two-column layout on desktop: a wider primary column carrying the pipeline stepper, case statistics, property records, and notes (Sections 11.1–11.3), and a persistent right column carrying tasks and appointments (Section 11.4) that remains visible while the primary column scrolls — never hidden behind a tab, per the original requirement that everything on this page stay visible together.
- The **Dashboard** uses a card-grid layout for headline metrics (Section 9), with room designed in from the start for trend charts and team-level breakdowns (Section 16, Phase 3) without a structural rebuild.

### 8.5 Signature Element: The Aurora Arc

The pipeline stepper is rendered as a thin horizontal gradient bar — the Aurora Arc — that fills left to right (Horizon Teal into Dusk Indigo) as a case advances through its four stages, reaching full, luminous teal at "Resolved/Freedom." This same motif reappears in miniature in two other places: as a small progress indicator on each row of the Clients directory (Section 10), so stage progress is visible without opening a record, and as the visual basis for a stage-breakdown chart on the Dashboard (Section 9). One consistent, ownable visual thread ties all three surfaces together, reinforcing the product's connective-navigation goal (Section 7) visually as well as functionally, and giving Aurora a genuine identity rather than a generic admin-panel look.

### 8.6 Component Inventory (mapped to shadcn/ui)

- **Table** — Clients directory (Section 10), Tasks list (Section 12)
- **Command** — global search / command palette (Section 7.1)
- **Badge** — client health status, task status, note channel tags
- **Card** — Dashboard metric tiles (Section 9)
- **Custom stepper (Progress-based)** — the Aurora Arc pipeline indicator (Section 8.5)
- **Calendar** — Tasks page (Section 12.1)
- **Inline panel / Sheet (not Dialog)** — Tasks page right-side scheduling panel, per the existing "no modal" requirement (Section 12.3), and the Client 360 stage-confirmation panel (Section 7.5)
- **Dropdown Menu** — note channel selector (Section 11.3)
- **Tabs — deliberately not used on Client 360**, since all sections remain visible on one scrollable page (Section 6)
- **Toast** — save confirmations across the app (note saved, task completed, stage updated)

### 8.7 States & Microcopy

- **Empty states** are written as an invitation to act, not a blank space — for example, an empty Tasks list reads "Nothing due today. Add a task to keep this case moving." rather than a generic "No tasks found."
- **Errors** are specific and written in the interface's own voice — for example, a failed note save reads "Couldn't save this note. Check your connection and try again," never a raw error code.
- **Loading states** use skeleton placeholders shaped like the content beneath them (table rows, card outlines) rather than a generic spinner, so the layout doesn't shift once real data arrives.

### 8.8 Accessibility & Responsiveness Floor

- Designed desktop-first for daily internal case-management use, with responsive behavior maintained down to tablet width; phone-width support is not a Phase 1 priority given the internal, at-a-desk usage pattern, but the layout should not actively break at smaller sizes.
- Visible keyboard focus states on every interactive element, inherited largely for free from shadcn/ui's underlying Radix primitives.
- `prefers-reduced-motion` is respected throughout — the Aurora Arc's fill animation becomes an instant state change rather than an animated transition when a user has reduced motion enabled at the system level.
- **Theme support:** Light is the default theme. A user-toggleable dark mode is exposed in the Dashboard header (upper-right). The toggle supports three states — Light / Dark / System — where System respects `prefers-color-scheme`. Theme choice is persisted via cookie for instant apply and via the settings table for cross-session durability on the single owner-operator account. An inline anti-FOUC script applies the correct `dark` class on `<html>` before first paint to prevent a flash of the wrong theme on hard reload.
- **Section accent strips:** Each top-level section on the Dashboard, Clients directory, Client 360 workspace, and Tasks page is wrapped with a 2px inset left accent bar in its semantic color (Teal / Indigo / Amber / Peach / Green). The accent is implemented as `box-shadow: inset` so it adds no layout width and never affects responsive behavior.

## 9. Overview / Metrics Dashboard

The Overview Dashboard is the first screen a user sees upon login. Its purpose is to provide an immediate, complete snapshot of business health without requiring navigation into any individual client record.

**Required metrics and elements:**
- File/case completion rates across the full active caseload
- Total business closed/done, expressed both in count and dollar value
- Sales performance figures
- Aggregate portfolio metrics rolled up from Client 360 data: total debt eliminated across all resolved cases, total properties currently under management, average time-to-resolution, and overall case resolution rate

The dashboard should be designed to scale in sophistication over time — starting with the metrics above, and structured so that additional visualizations (charts, trend lines, team-level breakdowns) can be added later without a structural rebuild. Because this page is the first thing every user sees, it should load fast and prioritize clarity over density: a small number of clearly labeled, well-organized metrics rather than a cluttered wall of numbers.

Each headline metric card is clickable and routes into a pre-filtered Clients directory view, per the click-path defined in Section 7.2 — for example, clicking an "At-Risk Cases" count navigates to `/clients?health=at-risk`. This means the Dashboard functions as an entry point into action, not merely a read-only report: a leader who spots a concerning number can move directly into the filtered list of clients behind it in a single click.

## 10. Clients Page

The Clients page serves as the searchable, filterable directory of every client in the system, and is the entry point into any individual Client 360 record.

**Required fields displayed per client:**
- Name
- Phone number
- State
- ZIP code
- Email

**Approved enhancements** (recommended and now formally in scope):
- **Client Detail routing:** clicking a client routes into the full Client 360 workspace, not an inline expansion, preserving room for the depth described in Section 11.
- **Client Health Indicator:** a computed status badge (Active / At Risk / Inactive) derived from case activity data already present in the system — last contact date, task completion patterns, and stage duration — requiring no external scoring service.
- **Search & Filter:** filter the client list by name, state, ZIP, or health status, implemented as client-side filtering with no added infrastructure cost, with filter state persisted in the URL per Section 7.3.
- **Notes/Activity Preview:** a lightweight indicator on each row showing recent activity, giving staff a sense of case freshness without opening the full record.
- **Sortable Columns:** every visible column (name, state, health status) should be sortable.
- **Tagging/Segmentation:** custom, freeform tags (e.g., "VIP," "Referral," "New") for flexible grouping and filtering beyond fixed fields.
- **Basic Duplicate Detection:** simple matching logic against name, email, and phone fields to flag likely duplicate client entries at the point of creation or periodically in review.

Structurally, this page is implemented as a shadcn/ui `Table` (Section 8.6) with sortable headers, health status rendered as a `Badge`, and a miniature Aurora Arc (Section 8.5) reflecting each client's pipeline progress directly in the row — so staff can gauge how far along a case is without opening every record individually. The exact click behavior from a row into Client 360 is defined in Section 7.2.

## 11. Client 360 — Primary Workspace

The Client 360 page, reached by clicking into any client from the Clients directory (or via global search), is **the main operational surface of Aurora**. It is designed to be the page where staff spend the majority of their working time, and therefore must present the fullest possible picture of a client's case in a single, well-organized view.

### 11.1 Process & Case Statistics

Modeled directly on Wesley Financial Group's four-stage client journey, but expanded into a fully trackable operational pipeline:

- **Current pipeline stage:** Consultation → Exit Plan Submitted → In Progress ("The Fight") → Resolved/Cancelled ("Freedom")
- **Days in current stage** and **total days in process**, calculated automatically from stage-transition timestamps
- **Case opened date**
- **Last contact date**
- **Next scheduled action/appointment**, pulled directly from the Tasks system
- **Amount owed vs. amount paid off**, displayed as a clear progress indicator
- **Maintenance fee status**, including upcoming due dates
- **Document/contract reference status** (submitted, pending, missing)
- **Case health/risk flag** — a simple computed indicator (stalled, on-track, at-risk) based on time-in-stage and last-contact recency
- **Percent complete toward resolution**
- **Assigned rep/owner** — present in the data model (Section 13) for forward compatibility, but not surfaced in the UI or actively used during the single-user phase; it activates once multi-user support ships (Section 16, Phase 4)

These statistics should be presented prominently at the top of the Client 360 page, giving any staff member an instant read on where this case stands without scrolling.

### 11.2 Fractional Ownership / Property Records

Because a single client may hold more than one timeshare or fractional property interest, this section is structured as a **list of property records per client**, not a single fixed set of fields. Each property record includes:

- Title/entry information
- Resort name and location
- Amount owed
- Amount due
- Paid-off status — represented as a clickable Yes/No toggle for fast updates
- Maintenance fee tracker, including recurring amount and due date
- Document/contract reference field (a reference link or note, not a file-hosting requirement, to preserve the zero-cost infrastructure constraint)
- Savings/value-eliminated tracker per property, which feeds directly into the aggregate metrics on the Overview Dashboard

This structure ensures Aurora can represent complex, multi-property cases just as easily as simple single-property ones, without any redesign.

### 11.3 Notes System

Notes are treated as a first-class, structured feature rather than a plain text box, in direct response to the requirement that every note be attributable to a specific communication channel.

- A **dropdown selector** on every new note entry, allowing staff to tag the note type as **Email, Phone, or Text**
- Each note stores: channel tag, timestamp, author (populated with the single owner-operator's ID during this phase, and meaningful once multiple users exist in Phase 4), and full message content
- Notes are displayed in **chronological order, most recent first**, forming a complete communication history for the case
- This structure allows future reporting on communication patterns (e.g., how many touches per channel a case typically requires before resolution)

### 11.4 Tasks & Appointments

The Client 360 page displays this specific client's tasks and appointments directly within the workspace, so staff never need to leave the case record to see what's due. Critically, this is not a duplicated data set — tasks created here **sync bidirectionally with the standalone Tasks page** described in Section 12, using a single shared data source. Creating, completing, or rescheduling a task from either location updates it everywhere, per the synchronization mechanism defined in Section 7.4.

### 11.5 Pipeline Stepper Interaction Detail

The four-stage pipeline from Section 11.1 is rendered visually as the Aurora Arc (Section 8.5), not as plain text. Clicking any stage node opens a small inline confirmation — not a full-page navigation or modal dialog — asking the user to confirm the transition. On confirmation, Aurora automatically timestamps the change, recalculates the "days in current stage" and "total days in process" statistics, and re-evaluates the case health flag, all in place on the same page. This same interaction and its downstream effects are specified from the navigation side in Section 7.5.

### 11.6 Page Layout Detail

Client 360 uses the two-column desktop layout described in Section 8.4: a sticky page header at the top containing the client's name, their health badge, and a breadcrumb ("Clients / [Client Name]") that links back to `/clients` while restoring whatever filter or sort state the user had before (Section 7.3). Below the header, the primary column contains Sections 11.1 through 11.3 in order — statistics, property records, then notes — while a persistent right column holds Section 11.4 (tasks and appointments) and remains visible as the primary column scrolls, so nothing on this page ever requires a tab switch to see.

## 12. Tasks Page

The Tasks page is a standalone, cross-client surface designed for day-to-day scheduling and follow-up management across the entire caseload — not just one client at a time.

### 12.1 Layout

- **Top-left:** Calendar view
- **Filter bar:** Due date, Client, and Status (overdue / upcoming / completed)
- **Main area:** Task list
- **Right side:** Scheduling and notes panel

### 12.2 Filtering

Per confirmed requirements, the Tasks page supports filtering by:
- **Due date** (specific date or date range)
- **Client** (view all tasks tied to a specific case)
- **Status** (overdue, upcoming, completed)

### 12.3 Design & Efficiency Requirements

To make the Tasks page elegant, fast, and pleasant to use daily, the following are approved as in-scope design requirements, all achievable with the existing free-tier stack:

- **Color-coded status/priority badges** — red for overdue, yellow for due soon, green for on-track/upcoming, using Tailwind and shadcn/ui badge components for instant visual scanning
- **Calendar with task-density indicators** — each day on the calendar shows a small dot or count reflecting how many tasks are due, turning the calendar into a genuine workload-at-a-glance tool rather than a plain date picker
- **Compact list with expandable rows** — the default list view shows client name, due date, and status; clicking a row expands it in place to reveal full task detail and related notes, avoiding unnecessary page navigation
- **Quick-complete checkbox** — tasks can be marked complete directly from the list without opening the full record
- **Inline quick-add** — new tasks (client, due date, note) can be created directly from the Tasks page without navigating back to Client 360
- **Sticky filter bar** — the Due Date / Client / Status filter controls remain pinned at the top of the page while scrolling a long task list
- **"Today + overdue" default view** — the page opens focused on what's most urgent, with a clear toggle to expand to the full upcoming list, preventing an overwhelming initial load
- **Keyboard shortcuts** — common actions such as quick-add (Enter) and closing a detail panel (Esc) are supported to make the page feel fast for high-volume daily use
- **Live right-side panel** — selecting a task or a calendar day populates the right-side scheduling/notes panel directly, rather than opening a modal, keeping the user's context and flow uninterrupted

### 12.4 Rationale: Why the Tasks Page Matters as Much as Client 360

It's worth stating explicitly why the Tasks page is treated as a first-class surface in Aurora rather than a secondary utility bolted onto the Client 360 page. In a caseload-driven business like timeshare exit work, the single greatest operational risk is not a lack of information — it's a stalled case that nobody notices has gone quiet. A case manager can only hold so many active files in their head at once, and the further a client's case drifts from active attention, the more likely that client is to lose trust in the process, escalate a complaint, or churn out of the pipeline entirely.

The Tasks page exists to make that risk visible and manageable at the portfolio level, not just the individual case level. By pulling every open task across every client into a single, filterable, calendar-anchored view, Aurora gives staff — and eventually leadership — a way to answer questions that no single Client 360 page can answer alone: What's overdue across the entire caseload today? Which clients have no upcoming action scheduled at all? Is a particular rep's task list becoming unmanageable? These are portfolio-health questions, and they require a dedicated, purpose-built surface rather than being inferred by clicking through client records one at a time.

This is also why the bidirectional sync between Client 360 and the Tasks page is treated as a hard requirement rather than a nice-to-have. If task data lived in two separate places, staff would inevitably create tasks in one location and forget to check the other, reintroducing exactly the kind of dropped follow-up that Aurora is designed to eliminate. A single shared task record, surfaced in two different contexts (client-specific and portfolio-wide), is the only design that fully satisfies both use cases without duplicating data or introducing sync errors.

### 12.5 Return Path to Client 360

Clicking a client's name within any task row — as opposed to clicking elsewhere on the row, which expands it in place per Section 12.3 — navigates to that client's Client 360 page, deep-linked directly to the Tasks & Appointments section via the anchor pattern described in Section 7.3. This completes the round-trip between the two surfaces: a user can move from a portfolio-wide task list into full case context in a single click, and back again with the browser's own back button, with filter state intact.

## 13. Data Model & Schema Detail

At a conceptual level, Aurora's data model centers on four core entities and their relationships:

- **Client** — the central entity, holding contact information (name, phone, state, ZIP, email), health status, tags, and pipeline stage. A Client has one or many Properties, one or many Notes, and one or many Tasks.
- **Property** — represents a single fractional/timeshare ownership record, always associated with exactly one Client, containing resort/title details, financial fields (owed, due, paid-off status), maintenance fee data, and a document reference.
- **Note** — a timestamped communication record associated with one Client, tagged by channel (Email, Phone, Text), containing message content.
- **Task** — a schedulable action item associated with one Client, containing a due date, status, and description, and appearing in both the Client 360 page and the standalone Tasks page via a single shared record (not duplicated data).

This structure keeps the system relationally simple — every Property, Note, and Task always traces back to a single owning Client — while remaining flexible enough to support multiple properties, an unlimited note history, and an unlimited task list per client.

To make this directly implementable, the following TypeScript-style definitions specify the exact fields, types, and enumerations behind each entity:

```typescript
type PipelineStage = "consultation" | "exit_plan" | "in_progress" | "resolved";
type HealthStatus  = "on_track" | "at_risk" | "stalled";
type TaskStatus     = "upcoming" | "overdue" | "completed";
type NoteChannel    = "email" | "phone" | "text";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  zip: string;
  stage: PipelineStage;
  stageEnteredAt: string;        // ISO timestamp — powers "days in stage"
  caseOpenedAt: string;
  lastContactAt: string | null;
  healthStatus: HealthStatus;    // computed, never manually set
  assignedRepId: string | null;  // reserved for Phase 4 multi-user support; null/unused during the single-user MVP
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Property {
  id: string;
  clientId: string;              // foreign key → Client
  resortName: string;
  resortLocation: string;
  amountOwed: number;
  amountDue: number;
  paidOff: boolean;
  maintenanceFeeAmount: number | null;
  maintenanceFeeDueDate: string | null;
  documentReference: string | null;
  valueEliminated: number | null; // feeds Dashboard rollups (Section 9)
}

interface Note {
  id: string;
  clientId: string;              // foreign key → Client
  channel: NoteChannel;
  authorId: string | null;       // the single owner-operator's user ID during this phase
  content: string;
  createdAt: string;
}

interface Task {
  id: string;
  clientId: string;              // foreign key → Client — single shared record (Section 7.4)
  title: string;
  description: string | null;
  dueDate: string;
  status: TaskStatus;            // derived from dueDate and completedAt
  completedAt: string | null;
}
```

This schema is the binding reference for both the Supabase database/type-generation approach (Section 5.2) and the client-side cache keys used for cross-page synchronization (Section 7.4). The `clientId` foreign key present on `Property`, `Note`, and `Task` is what makes the "one record, many surfaces" principle (Section 18) implementable in practice: it is structurally impossible for a task to exist in Client 360 but not the Tasks page, or vice versa, because there is only ever one row per task, referenced from wherever it needs to appear.

In Supabase/Postgres, table and column names conventionally use `snake_case` (e.g., `stage_entered_at`), while the TypeScript interfaces above use `camelCase`; whichever type-generation approach from Section 5.2 is chosen should handle this mapping automatically rather than requiring manual translation in application code. Every table above should have RLS enabled with an owner-scoped policy from the first migration (Section 5.1), even though only one owner-operator exists today.

## 14. Branding

- **Product name:** Aurora
- **Acquiring/parent company:** Consumer Attorney Network

Branding considerations for future phases should reflect a professional, trustworthy tone consistent with both the legal/consumer-advocacy positioning of Consumer Attorney Network and the high-trust nature of the timeshare exit industry, where clients are often anxious, financially stressed, and seeking reassurance. The Aurora Arc signature element (Section 8.5) is a direct visual expression of the brand name itself and should be treated with the same consistency as the wordmark — it is not a decorative flourish, but the product's core visual identity.

## 15. Success Metrics

Aurora's success should be measured across two dimensions: internal operational efficiency and product/acquisition readiness.

**Operational efficiency:**
- Reduction in time-to-locate a client record (via global search adoption)
- Reduction in average time-in-stage across the case pipeline
- Increase in task completion rate and reduction in overdue task volume
- Consistency and completeness of note logging across channels

**Product/acquisition readiness:**
- Zero recurring software cost maintained throughout development, using the required GitHub/Supabase/Vercel stack strictly on free tiers
- Full feature parity with (and clear differentiation from) the Wesley Financial Group operational benchmark
- Clean, documented, and extensible codebase suitable for technical due diligence by Consumer Attorney Network

## 16. Phased Roadmap

**Phase 1 (MVP, single-user):** Overview Dashboard with core metrics, Clients page with required fields and health indicator, Client 360 with full process statistics, property records, notes system with channel tagging, and basic task display — all running on Supabase (Postgres, Auth, and RLS from day one) with exactly one owner-operator account provisioned. Global search implemented site-wide as a command palette (Section 7.1), with the core visual design system (Section 8) and the cross-page data-synchronization strategy (Section 7.4) in place from the start, since every later phase depends on both being solid.

**Phase 2:** Standalone Tasks page with full calendar, filtering, and elegant UX enhancements (color coding, quick-add, expandable rows, live side panel). Bidirectional sync between Client 360 tasks and the Tasks page fully implemented, including the deep-link return path described in Section 12.5.

**Phase 3:** Advanced Clients page enhancements — tagging/segmentation, duplicate detection, sortable columns at scale. Dashboard evolves to include trend visualizations and team-level breakdowns, building on the Aurora Arc motif already established in Phase 1 (Section 8.5).

**Phase 4 (Multi-user expansion, post-acquisition readiness):** Begins only once the single-user MVP is complete and tested, per explicit product direction. Adds real multi-user support — activating the `assignedRepId`/`authorId` fields already reserved in the schema (Section 13), introducing role-based Supabase RLS policies on top of the owner-scoped policy from Section 5.1, and defining the permission model referenced in Section 17. Also includes expanded reporting for Consumer Attorney Network stakeholder visibility and any additional integrations — always evaluated first against the zero-paid-subscription constraint before being added to scope.

## 17. Open Questions & Risks

**Resolved in this revision:**
- ~~Authentication approach~~ — Decided: Supabase Auth, free tier, single account provisioned (Section 5.2).
- ~~Database selection~~ — Decided: Supabase Postgres, free tier (Section 5.2).
- ~~Multi-user timing~~ — Decided: deferred to Phase 4, beginning only after the single-user MVP is complete and tested, per explicit product direction (Section 16).

**Still open:**
- **Document handling — activation decision:** the current scope treats contract/document fields as references rather than hosted files. If actual file upload/storage becomes a requirement, Supabase Storage (Section 5.2) is the pre-approved option, but the decision to turn it on is still pending.
- **Free-tier operational risk — project pausing:** Supabase free projects pause automatically after roughly a week with no incoming requests. For a single-user internal tool that might go untouched over a slow stretch or a holiday, that's a real risk of the app being unreachable the next time someone opens it. A lightweight, free mitigation — for example, a scheduled GitHub Actions job that pings the project on a regular interval — should be set up in Phase 1 rather than discovered the first time the app is unexpectedly offline.
- **Multi-user role design:** the timing is now settled (see above), but the specific roles and their exact permissions (e.g., case manager vs. leadership view) are not yet defined and should be scoped when Phase 4 begins.
- **Notification/reminder delivery:** task due-date alerts are implied but not yet specified — whether these should be in-app only, or extend to email/SMS, needs confirmation, keeping in mind the zero-cost constraint on any messaging service.
- **Historical data migration:** if existing client and case data currently lives in spreadsheets or another system, a migration plan and data-cleaning pass will need to be scoped before Phase 1 launch, particularly to support the duplicate-detection logic described in Section 10.
- **Reporting cadence for Consumer Attorney Network:** it is not yet defined whether portfolio-level reporting should be delivered as a live dashboard view, a scheduled export, or both — this should be clarified before Phase 4 planning begins.

## 18. Appendix: Design Principles Summary

To keep every future design and engineering decision aligned as Aurora grows beyond this initial PRD, the following seven principles should be treated as durable guardrails rather than one-time decisions:

**Zero-cost infrastructure, permanently, on the required stack.** Every dependency, library, or service added to Aurora at any point in its lifecycle must run on GitHub, Supabase, Vercel, Next.js, and shadcn/ui, strictly within their free tiers. This is not a bootstrapping phase to be "graduated" out of later, and it is not an invitation to swap in a different platform later — it is a core part of Aurora's value proposition as an acquisition target, since it directly protects margin for whoever owns the platform.

**The Client 360 page is the center of gravity.** Every other surface in Aurora — the Dashboard, the Clients directory, the Tasks page — exists to either feed data into, or pull staff toward, the Client 360 page. Any new feature proposal should be evaluated by asking whether it strengthens that center of gravity or distracts from it.

**Statistics should always be computed, never manually maintained.** Every metric described in this document, from case health flags to portfolio-level savings totals, should be derived automatically from underlying data (stage timestamps, financial fields, task completion) rather than requiring a human to manually update a number. This is what allows Aurora to produce Wesley Financial Group–caliber aggregate statistics in real time rather than as a periodic reporting exercise.

**Speed of data entry protects data quality.** Features like inline quick-add, quick-complete checkboxes, and dropdown-tagged notes exist because the fastest path to entering information correctly is also the path most likely to actually get used under real day-to-day workload. Any future feature that adds friction to logging a note, updating a stage, or completing a task should be scrutinized carefully, since friction at the point of data entry is the most common cause of CRM data going stale.

**One record, many surfaces.** As demonstrated by the task-sync requirement between Client 360 and the Tasks page, and formalized in the schema in Section 13, Aurora should always favor a single underlying data record displayed contextually in multiple places over duplicated records that can drift out of sync. This principle should extend to any future feature that touches client, property, note, or task data.

**One connected experience, not four tools.** Search, the Clients directory, Client 360, and the Tasks page should always feel like different views into the same underlying case data, not separate destinations a user has to consciously travel between. Every new feature should be checked against the click-path and state-preservation patterns in Section 7 before it ships, so the product never regresses into four disconnected surfaces stitched together after the fact.

**Build for one, design for many.** Every piece of the single-user MVP — especially authentication, Row-Level Security policies, and the `assignedRepId`/`authorId` fields already reserved in the data model (Sections 5.1, 5.2, and 13) — is structured so that adding real multi-user support in Phase 4 is additive: new policies and new UI, not a schema rewrite or a security retrofit.

These seven principles, taken together, are what allow Aurora to scale from its Phase 1 single-user MVP through eventual multi-user, post-acquisition operation without requiring a fundamental rebuild — every phase in Section 16 is designed to add capability on top of this same foundation, not replace it.
