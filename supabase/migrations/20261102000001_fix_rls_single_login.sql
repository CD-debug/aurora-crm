-- Fix RLS for single-login CRM model
-- One auth user owns all data; team_members are display labels only.
-- Issue: closing_data had RLS enabled (via dashboard) without a policy → deny all.

-- 1) closing_data: enable RLS + owner policy (single auth user = owner via property → client → author_id)
alter table public.closing_data enable row level security;

drop policy if exists "closing_data_owner" on public.closing_data;
create policy "closing_data_owner" on public.closing_data
  for all using (
    property_id in (
      select p.id from public.properties p
      join public.clients c on p.client_id = c.id
      where c.author_id = auth.uid()
    )
  );

-- 2) team_members: ensure owner policy exists (single auth user owns all team member labels)
-- Migration 20260729000000 already created this, but re-apply in case it was dropped
drop policy if exists "team_members_owner" on public.team_members;
create policy "team_members_owner" on public.team_members
  for all using (auth.uid() = owner_id);

-- 3) Verify core tables have owner policies (idempotent)
-- Clients
drop policy if exists "clients_owner" on public.clients;
create policy "clients_owner" on public.clients
  for all using (auth.uid() = author_id);

-- Properties (via client ownership)
drop policy if exists "properties_owner" on public.properties;
create policy "properties_owner" on public.properties
  for all using (
    client_id in (select id from public.clients where author_id = auth.uid())
  );

-- Notes
drop policy if exists "notes_owner" on public.notes;
create policy "notes_owner" on public.notes
  for all using (
    client_id in (select id from public.clients where author_id = auth.uid())
  );

-- Tasks
drop policy if exists "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks
  for all using (
    client_id in (select id from public.clients where author_id = auth.uid())
  );

-- Settings (owner-only per user settings)
drop policy if exists "settings_owner" on public.settings;
create policy "settings_owner" on public.settings
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Recently viewed (owner-only)
drop policy if exists "recently_viewed_owner" on public.recently_viewed;
create policy "recently_viewed_owner" on public.recently_viewed
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);