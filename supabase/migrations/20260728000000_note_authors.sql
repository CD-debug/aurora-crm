-- Note authors (staff) + pinned/editable notes
-- Phase: notes UX upgrade (author attribution, edit, pin)

-- 1) Table for named note authors (NOT auth users — single-login env)
create table public.note_authors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.note_authors enable row level security;
create policy "note_authors_owner" on public.note_authors
  for all using (auth.uid() = owner_id);

-- 2) Extend notes with staff_id (FK to note_authors), pinned, updated_at
alter table public.notes
  add column if not exists staff_id uuid references public.note_authors(id) on delete set null,
  add column if not exists pinned boolean not null default false,
  add column if not exists updated_at timestamptz;

create index if not exists idx_notes_staff on public.notes(staff_id);
create index if not exists idx_notes_pinned on public.notes(pinned) where pinned = true;

-- 3) Refresh the clients_with_health view to include new notes columns (pinned, staff_id)
-- The view uses SELECT * from notes in CTE — drop and recreate to pick up new columns.
drop view if exists public.clients_with_health cascade;

create view public.clients_with_health as
select
  c.*,
  -- last contact from any note
  (
    select max(n.created_at)
    from public.notes n
    where n.client_id = c.id
  ) as last_contact_at,
  -- open task count
  (
    select count(*)
    from public.tasks t
    where t.client_id = c.id
      and t.completed_at is null
  ) as open_task_count,
  -- overdue task count
  (
    select count(*)
    from public.tasks t
    where t.client_id = c.id
      and t.completed_at is null
      and t.due_date < current_date
  ) as overdue_task_count,
  -- nearest upcoming due date (today or later) among open tasks
  (
    select min(t.due_date)
    from public.tasks t
    where t.client_id = c.id
      and t.completed_at is null
      and t.due_date >= current_date
  ) as next_task_due,
  -- health status: resolved -> on_track, else based on overdue tasks & last contact
  case
    when c.stage = 'resolved' then 'on_track'::text
    when c.stage in ('in_progress', 'exit_plan') then
      case
        when exists (
          select 1 from public.tasks t
          where t.client_id = c.id
            and t.completed_at is null
            and t.due_date < current_date
        ) then 'stalled'::text
        when exists (
          select 1 from public.notes n
          where n.client_id = c.id
            and n.created_at < now() - interval '14 days'
        ) then 'at_risk'::text
        else 'on_track'::text
      end
    else 'on_track'::text
  end as health_status
from public.clients c;

grant select on public.clients_with_health to authenticated;