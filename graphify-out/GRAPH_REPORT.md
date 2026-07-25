# Graph Report - .  (2026-07-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 423 nodes · 918 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2c35d78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- [clientId]/page.tsx
- clients/page.tsx
- dependencies
- devDependencies
- index.ts
- domain.ts
- compilerOptions
- components.json
- 20240718000002_rls_and_functions.sql
- 20260724000000_reconcile_prd_intent.sql
- 20240718000001_initial_schema.sql
- proxy.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `cn()` - 112 edges
2. `Client360Page()` - 21 edges
3. `requireUser()` - 16 edges
4. `compilerOptions` - 16 edges
5. `revalidate()` - 15 edges
6. `fail()` - 15 edges
7. `TasksPageContent()` - 13 edges
8. `Button()` - 11 edges
9. `createClient()` - 11 edges
10. `taskStatus()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `DropdownMenuLabel()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `DropdownMenuSubTrigger()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `DropdownMenuSubContent()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `DropdownMenuCheckboxItem()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 0 - "cn"
Cohesion: 0.06
Nodes (58): PropertyCard(), StatCard(), LoginForm(), Button(), buttonVariants, Calendar(), Card(), CardAction() (+50 more)

### Community 1 - "[clientId]/page.tsx"
Cohesion: 0.12
Nodes (45): CHANNEL_META, Client360Page(), EMPTY_PROPERTY_FORM, ClientsPageContent(), TaskPanel(), TasksPageContent(), fetchClient360(), fetchClients() (+37 more)

### Community 2 - "clients/page.tsx"
Cohesion: 0.07
Nodes (31): EMPTY_FORM, SORTABLE, SortKey, Badge(), badgeVariants, DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent() (+23 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (42): @base-ui/react, class-variance-authority, clsx, cmdk, date-fns, lucide-react, next, next-themes (+34 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (41): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, @playwright/test (+33 more)

### Community 5 - "index.ts"
Cohesion: 0.08
Nodes (25): GET(), fraunces, ibmPlexMono, ibmPlexSans, metadata, DashboardPage(), metadata, MetricCard() (+17 more)

### Community 6 - "domain.ts"
Cohesion: 0.15
Nodes (26): AuroraArcStepper(), AuroraArcStepperProps, healthVariants, stageVariants, taskLabels, TaskStatusBadge(), taskVariants, ClientFilters (+18 more)

### Community 7 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 8 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "20240718000002_rls_and_functions.sql"
Cohesion: 0.28
Nodes (7): clients_updated_at, properties_updated_at, public.clients, public.handle_updated_at(), public.notes, public.properties, public.tasks

### Community 10 - "20260724000000_reconcile_prd_intent.sql"
Cohesion: 0.48
Nodes (6): clients_stage_transition, public.clients, public.clients_with_health, public.handle_stage_transition(), public.notes, public.tasks

### Community 11 - "20240718000001_initial_schema.sql"
Cohesion: 0.70
Nodes (4): public.clients, public.notes, public.properties, public.tasks

## Knowledge Gaps
- **122 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `[clientId]/page.tsx`, `clients/page.tsx`, `dependencies`, `index.ts`, `domain.ts`?**
  _High betweenness centrality (0.366) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `CalendarDayButton()` connect `dependencies` to `cn`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.05709876543209876 - nodes in this community are weakly interconnected._
- **Should `[clientId]/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12368024132730016 - nodes in this community are weakly interconnected._
- **Should `clients/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06553911205073996 - nodes in this community are weakly interconnected._