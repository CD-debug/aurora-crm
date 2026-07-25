-- Reconciliation migration: align the schema with the PRD's actual model.
--
-- PRD principles enforced here:
--   * "Statistics should always be computed, never manually maintained."
--     -> health_status and last_contact_at are DERIVED (view), not stored.
--     -> task status is DERIVED from due_date + completed_at, not stored.
--     -> avg time-to-resolution uses a real resolved_at timestamp (was now()).
--   * Note channels are exactly Email / Phone / Text (PRD 11.3).
--
-- Destructive to the failed first attempt's derived columns; base rows preserved.

-- ---------------------------------------------------------------------------
-- 1) note_channel -> ('email', 'phone', 'text'), preserving existing rows
-- ---------------------------------------------------------------------------
alter table public.notes alter column channel type text;

update public.notes set channel = case channel
  when 'call'     then 'phone'
  when 'sms'      then 'text'
  when 'meeting'  then 'phone'
  when 'internal' then 'text'
  else 'email'
end;

drop type public.note_channel;
create type public.note_channel as enum ('email', 'phone', 'text');

alter table public.notes
  alter column channel type public.note_channel
  using channel::public.note_channel;

-- ---------------------------------------------------------------------------
-- 2) tasks: status is derived (completed_at set -> completed; overdue when
--    due_date < today; else upcoming). Drop the stored enum.
-- ---------------------------------------------------------------------------
alter table public.tasks drop column if exists status;
drop type if exists public.task_status;

-- ---------------------------------------------------------------------------
-- 3) clients: drop stored derived columns; add resolved_at
-- ---------------------------------------------------------------------------
alter table public.clients drop column if exists health_status;
alter table public.clients drop column if exists last_contact_at;
alter table public.clients add column if not exists resolved_at timestamptz;

-- Backfill resolved_at for cases already resolved (best available timestamp)
update public.clients
  set resolved_at = coalesce(resolved_at, updated_at, created_at)
  where stage = 'resolved';

drop type if exists public.health_status;

-- ---------------------------------------------------------------------------
-- 4) Stage transitions are timestamped by the database, not the client:
--    any stage change stamps stage_entered_at; entering 'resolved' stamps
--    resolved_at; leaving 'resolved' clears it.
-- ---------------------------------------------------------------------------
create or replace function public.handle_stage_transition()
returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_entered_at := now();
    if new.stage = 'resolved' then
      new.resolved_at := now();
    else
      new.resolved_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists clients_stage_transition on public.clients;
create trigger clients_stage_transition
  before update on public.clients
  for each row execute function public.handle_stage_transition();

-- ---------------------------------------------------------------------------
-- 5) clients_with_health: the single definition of case health.
--    Reads through RLS of the underlying tables (security_invoker).
--
--    stalled : no contact (or case opened) 30+ days ago, OR 90+ days in stage
--    at_risk : no contact 14+ days ago, OR 45+ days in stage, OR overdue task
--    on_track: everything else; resolved cases are always on_track
-- ---------------------------------------------------------------------------
create or replace view public.clients_with_health
with (security_invoker = true) as
select
  c.*,
  lc.last_contact_at,
  coalesce(ts.open_task_count, 0)     as open_task_count,
  coalesce(ts.overdue_task_count, 0)  as overdue_task_count,
  ts.next_task_due,
  case
    when c.stage = 'resolved' then 'on_track'
    when coalesce(lc.last_contact_at, c.case_opened_at) < now() - interval '30 days'
      or c.stage_entered_at < now() - interval '90 days'
      then 'stalled'
    when coalesce(lc.last_contact_at, c.case_opened_at) < now() - interval '14 days'
      or c.stage_entered_at < now() - interval '45 days'
      or coalesce(ts.overdue_task_count, 0) > 0
      then 'at_risk'
    else 'on_track'
  end as health_status
from public.clients c
left join lateral (
  select max(n.created_at) as last_contact_at
  from public.notes n
  where n.client_id = c.id
) lc on true
left join lateral (
  select
    count(*) filter (where t.completed_at is null)                          as open_task_count,
    count(*) filter (where t.completed_at is null
                       and t.due_date < current_date)                       as overdue_task_count,
    min(t.due_date) filter (where t.completed_at is null
                       and t.due_date >= current_date)                      as next_task_due
  from public.tasks t
  where t.client_id = c.id
) ts on true;

grant select on public.clients_with_health to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Drop the superseded dashboard RPC. Metrics are computed in-app over
--    clients_with_health + properties (single query path, no second truth).
-- ---------------------------------------------------------------------------
drop function if exists public.get_dashboard_metrics(uuid);
