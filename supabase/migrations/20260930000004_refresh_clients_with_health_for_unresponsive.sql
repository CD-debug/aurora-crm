-- Recreate clients_with_health view to include is_unresponsive and unresponsive_since
-- PostgreSQL expands c.* at view-creation time, so the view must be recreated
-- to pick up columns added since the last migration.

drop view if exists public.clients_with_health cascade;

create or replace view public.clients_with_health
with (security_invoker = true) as
select
  c.*,
  lc.last_contact_at,
  coalesce(ts.open_task_count, 0)     as open_task_count,
  coalesce(ts.overdue_task_count, 0)  as overdue_task_count,
  ts.next_task_due,
  camf.current_annual_maintenance_fee,
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
) ts on true
left join lateral (
  select coalesce(sum(p.maintenance_fee), 0) as current_annual_maintenance_fee
  from public.properties p
  where p.client_id = c.id and p.status = 'active'
) camf on true;

grant select on public.clients_with_health to authenticated;
