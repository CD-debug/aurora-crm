# Aurora CRM

Timeshare exit case management — a single-user tool for tracking clients through the exit pipeline.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** Tailwind CSS 4 + Shadcn UI (Radix primitives)
- **Data:** Supabase (PostgreSQL + RLS) via `@supabase/ssr`
- **State:** TanStack Query (server actions for writes, browser queries for reads)
- **Auth:** Supabase email/password, single-user mode

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx              # Dashboard (server-rendered)
    clients/page.tsx      # Clients directory (filtered/sorted via URL)
    clients/[id]/page.tsx # Client 360 workspace
    tasks/page.tsx        # Tasks page
    login/                # Login form
  components/
    shared/               # NavRail, badges, AuroraArcStepper, GlobalSearch
    dashboard/            # MetricCard, StageBreakdown
    ui/                   # Shadcn primitives
  lib/
    data/
      mutations.ts        # Server actions (all writes)
      client-queries.ts   # Browser-side reads (TanStack Query)
      queries.ts          # Server-side reads (dashboard)
      domain.ts           # Pure domain logic (no I/O)
      types.ts            # TypeScript types
    supabase/             # SSR + browser Supabase clients
```

## How It Works

**Writes** go through server actions in `lib/data/mutations.ts` — validated with Zod, executed under RLS. After each write, `revalidatePath` refreshes server-rendered pages and callers invalidate TanStack Query keys to refresh browser views.

**Reads** go through `lib/data/client-queries.ts` (browser) or `lib/data/queries.ts` (server). Both query the `clients_with_health` view, which computes health status, last contact, and task counts on the fly — never stored.

**Auth** is gated by `src/proxy.ts` — unauthenticated users are redirected to `/login`. Row-level security in Supabase enforces that each user only sees their own data.

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run lint       # ESLint
npm test           # Vitest
npm run test:watch # Vitest in watch mode
```
