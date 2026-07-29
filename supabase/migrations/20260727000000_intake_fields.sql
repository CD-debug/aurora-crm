-- Intake fields: full client identity/contact + property ownership/fee detail.
-- All columns NULLABLE so the existing 13 clients and 10 properties keep passing
-- validation — staff completes intake fields over time; nothing breaks on day one.

-- ---------------------------------------------------------------------------
-- clients: identity + contact + engagement
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists dob date,
  add column if not exists ssn_last4 text,
  add column if not exists co_client_name text,
  add column if not exists address text,
  add column if not exists phone2 text,
  add column if not exists retainer_fee numeric(12,2);

-- SSN last-4: exactly 4 digits or NULL. Never stores more than the last 4.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_ssn_last4_check'
  ) then
    alter table public.clients
      add constraint clients_ssn_last4_check
      check (ssn_last4 is null or ssn_last4 ~ '^\d{4}$');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- properties: ownership usage + fee status
-- ---------------------------------------------------------------------------
alter table public.properties
  add column if not exists usage_frequency text,
  add column if not exists usage_type text,
  add column if not exists fees_current boolean not null default true,
  add column if not exists fees_behind_amount numeric(12,2),
  add column if not exists maintenance_fees_billed numeric(12,2);

-- Enum-style checks (matches existing migration style; keeps text columns simple)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_usage_frequency_check') then
    alter table public.properties add constraint properties_usage_frequency_check
      check (usage_frequency is null or usage_frequency in ('annual','biennial','odd_year','even_year'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_usage_type_check') then
    alter table public.properties add constraint properties_usage_type_check
      check (usage_type is null or usage_type in ('fixed_week','floating_week','points_based'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Refresh clients_with_health view to include the new intake columns.
-- PostgreSQL expands c.* at view-creation time, so re-running the same
-- definition picks up columns added since the view was last created.
-- ---------------------------------------------------------------------------
drop view if exists public.clients_with_health cascade;

create view public.clients_with_health
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
