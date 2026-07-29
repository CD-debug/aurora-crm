a-- ============================================================
-- Aurora CRM — Combined Migration (run once in Supabase SQL Editor)
-- Paste this entire file into https://supabase.com/dashboard/project/zkjytbnalmzmfxjkrhmn/sql
-- ============================================================

-- Migration 1: Initial Schema
create extension if not exists "pgcrypto";

create type public.client_stage as enum ('consultation', 'exit_plan', 'in_progress', 'resolved');
create type public.property_status as enum ('active', 'paid_off', 'foreclosed', 'relinquished');
create type public.note_channel as enum ('call', 'email', 'sms', 'meeting', 'internal');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  state text not null,
  zip text not null,
  stage public.client_stage not null default 'consultation',
  stage_entered_at timestamptz not null default now(),
  case_opened_at timestamptz not null default now(),
  assigned_rep_id uuid,
  tags text[] not null default '{}',
  author_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  resort_name text not null,
  resort_location text not null,
  unit_number text,
  purchase_price numeric(12,2),
  loan_balance numeric(12,2),
  maintenance_fee numeric(10,2),
  fee_due_date date,
  paid_off_at timestamptz,
  status public.property_status not null default 'active',
  document_reference text,
  value_eliminated numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null,
  channel public.note_channel not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null,
  title text not null,
  description text,
  due_date date not null,
  due_time time,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_clients_author_id on public.clients(author_id);
create index idx_clients_stage on public.clients(stage);
create index idx_clients_name on public.clients(name);
create index idx_clients_phone on public.clients(phone);
create index idx_clients_email on public.clients(email);
create index idx_properties_client_id on public.properties(client_id);
create index idx_properties_status on public.properties(status);
create index idx_notes_client_id on public.notes(client_id);
create index idx_notes_created_at on public.notes(created_at desc);
create index idx_tasks_client_id on public.tasks(client_id);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_tasks_author_id on public.tasks(author_id);

-- Migration 2: RLS and Functions
alter table public.clients enable row level security;
alter table public.properties enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;

create policy "clients_owner" on public.clients
  for all using (auth.uid() = author_id);

create policy "properties_owner" on public.properties
  for all using (
    client_id in (select id from public.clients where author_id = auth.uid())
  );

create policy "notes_owner" on public.notes
  for all using (
    client_id in (select id from public.clients where author_id = auth.uid())
  );

create policy "tasks_owner" on public.tasks
  for all using (
    client_id in (select id from public.clients where author_id = auth.uid())
  );

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.handle_updated_at();

-- Migration 4: Reconcile PRD intent (note channels, derived health, resolved_at, view)
-- Fix note_channel enum
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

-- Add resolved_at to clients
alter table public.clients add column if not exists resolved_at timestamptz;

-- Stage transition trigger
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

-- Health view (computed, never stored)
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

-- Migration 6: Settings table (corrected version)
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'default',
  owner_id uuid not null default auth.uid(),
  key text not null,
  value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings add constraint settings_org_id_owner_id_key_key unique (org_id, owner_id, key);
alter table public.settings enable row level security;

create policy "settings_owner" on public.settings
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();

create or replace function public.update_settings(
  p_key text,
  p_value jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (org_id, owner_id, key, value, updated_at)
  values ('default', auth.uid(), p_key, p_value, now())
  on conflict (org_id, owner_id, key)
  do update set value = p_value, updated_at = now();
end;
$$;

create or replace function public.get_settings(p_key text)
returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(value, '{}'::jsonb)
  from public.settings
  where org_id = 'default'
    and key = p_key
    and owner_id = auth.uid();
$$;

create or replace function public.regenerate_api_key()
returns text
language plpgsql security definer set search_path = public as $$
declare
  new_key text;
begin
  new_key := 'aurora_' || encode(gen_random_bytes(32), 'hex');
  insert into public.settings (org_id, owner_id, key, value, updated_at)
  values (
    'default',
    auth.uid(),
    'lead_ingestion',
    jsonb_build_object('enabled', true, 'api_key', new_key),
    now()
  )
  on conflict (org_id, owner_id, key)
  do update set value = public.settings.value || jsonb_build_object('api_key', new_key), updated_at = now();
  return new_key;
end;
$$;

-- Migration 7: Shrink property_status enum
update public.properties
set status = 'active'
where status not in ('active', 'paid_off');

alter type public.property_status rename to property_status_old;
create type public.property_status as enum ('active', 'paid_off');

alter table public.properties
  alter column status drop default,
  alter column status type text,
  alter column status type public.property_status using status::public.property_status,
  alter column status set default 'active';

drop type public.property_status_old;

-- Migration 8: Additional indexes
create index if not exists idx_clients_tags on public.clients using gin(tags);
create index if not exists idx_clients_resolved_at on public.clients(resolved_at);

-- Grant execute on functions
grant execute on function public.update_settings(text, jsonb) to authenticated;
grant execute on function public.get_settings(text) to authenticated;
grant execute on function public.regenerate_api_key() to authenticated;
