@AGENTS.md

## Design Tokens (Vibrant Refresh — Aug 2026)

Aurora's color tokens are OKLCH values in `src/app/globals.css`. Swapping the `:root` and `.dark` variable blocks re-themes the entire app — no component file edits needed.

**Light (default):** warm cream/sand base (hue ~70–85), with vibrant teal/indigo/peach accents. Reduces blue-light strain vs. the previous cool-gray palette.

**Dark:** warm charcoal (hue ~70), same hue families as light. Activated via the theme toggle in the Dashboard header (upper-right).

### Token reference

| Token | Light | Dark | Role |
|---|---|---|---|
| Background | `oklch(0.97 0.012 80)` | `oklch(0.20 0.015 70)` | Page surface |
| Surface-1 (Card) | `oklch(0.995 0.008 85)` | `oklch(0.24 0.018 70)` | Lifted card |
| Surface-2 (Section) | `oklch(0.95 0.018 75)` | `oklch(0.26 0.020 70)` | Mid-fill |
| Surface-3 | `oklch(0.92 0.025 70)` | `oklch(0.30 0.022 70)` | Hover/nested |
| Border | `oklch(0.86 0.018 75)` | `oklch(0.32 0.020 70)` | Lines, dividers |
| Primary (Teal) | `oklch(0.56 0.18 185)` | `oklch(0.65 0.16 185)` | Brand, Aurora Arc start |
| Chart-2 (Indigo) | `oklch(0.55 0.18 280)` | `oklch(0.62 0.16 280)` | Aurora Arc end |
| Aurora Peach | `oklch(0.78 0.12 50)` | `oklch(0.72 0.14 50)` | Highlight accent |

### Theme system files

- `src/lib/theme.ts` — `getTheme()`, `setThemeCookie()`, `htmlClassFor()`, `THEME_COOKIE_NAME='aurora-theme'`
- `src/lib/data/settings-actions.ts` — `updateTheme(theme)` server action (uses existing `update_settings` RPC)
- `src/app/layout.tsx` — async server layout that calls `getTheme()`, attaches `dark` class to `<html>`, includes inline anti-FOUC script in `<head>`
- `src/components/shared/ThemeToggle.tsx` — Dashboard toggle (Light / Dark / System); uses `useSyncExternalStore` to read the cookie hydration-safely
- `supabase/migrations/20260803000000_seed_theme_setting.sql` — seeds `settings` row `theme='light'` (looked up via `auth.users` since `auth.uid()` is null during migrations)

### Section accent strip utilities

Apply with `className="section-accent-{teal|indigo|amber|green|peach}"` on a wrapper element. Implemented via `box-shadow: inset 2px 0 0 0 ...` so no layout width is added.

- Dashboard: hero = teal, supporting metrics = indigo, risk row = amber, pipeline+attention = peach
- Clients directory: filter bar = indigo
- Tasks page: quick-add = amber, unified list = peach
- Client 360: statistics = teal, properties = amber, notes = peach, tasks = green

## Active Branch

`feat/vibrant-refresh-dark-mode` — contains Phase 1–7 of the vibrant refresh. The PRD (`C:\ResolutionCoreCRM\aurora-crm-master-prd.md`) §8.2 and §8.8 were updated locally on disk; that file is not part of the `aurora-crm` git repo so the changes are uncommitted until the parent repo decides where to track it.
