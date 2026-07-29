-- Promote note_authors to team_members (the single source of truth for
-- human attribution). Also extend tasks to carry an optional assignee.

-- 1) Rename table (Postgres rewrites FK references automatically)
alter table public.note_authors rename to team_members;

-- 2) Rename the owner policy to match the new table name
drop policy if exists "note_authors_owner" on public.team_members;
create policy "team_members_owner" on public.team_members
  for all using (auth.uid() = owner_id);

-- 3) Extend tasks with an optional assignee
alter table public.tasks
  add column if not exists staff_id uuid references public.team_members(id) on delete set null;
create index if not exists idx_tasks_staff on public.tasks(staff_id);

-- 4) Refresh the clients_with_health view (still reads tasks via count CTEs,
-- no changes needed, but we drop+create to be safe in case column set drifted)
drop view if exists public.clients_with_health cascade;
create view public.clients_with_health as
select
  c.*,
  (select max(n.created_at) from public.notes n where n.client_id = c.id) as last_contact_at,
  (select count(*) from public.tasks t where t.client_id = c.id and t.completed_at is null) as open_task_count,
  (select count(*) from public.tasks t where t.client_id = c.id and t.completed_at is null and t.due_date < current_date) as overdue_task_count,
  (select min(t.due_date) from public.tasks t where t.client_id = c.id and t.completed_at is null and t.due_date >= current_date) as next_task_due,
  case
    when c.stage = 'resolved' then 'on_track'::text
    when c.stage in ('in_progress', 'exit_plan') then
      case
        when exists (select 1 from public.tasks t where t.client_id = c.id and t.completed_at is null and t.due_date < current_date) then 'stalled'::text
        when exists (select 1 from public.notes n where n.client_id = c.id and n.created_at < now() - interval '14 days') then 'at_risk'::text
        else 'on_track'::text
      end
    else 'on_track'::text
  end as health_status
from public.clients c;

grant select on public.clients_with_health to authenticated;