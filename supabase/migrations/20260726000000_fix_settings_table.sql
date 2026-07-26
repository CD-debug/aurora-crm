-- Fix the settings table and functions
-- This replaces the broken 20260725000000_add_settings_table.sql

-- Drop broken functions
drop function if exists public.update_settings(text, jsonb);
drop function if exists public.get_settings(text);
drop function if exists public.regenerate_api_key();

-- Create or fix table
do $$
declare
  constraint_name text;
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'settings') then
    create table public.settings (
      id uuid primary key default gen_random_uuid(),
      org_id text not null default 'default',
      owner_id uuid not null default auth.uid(),
      key text not null,
      value jsonb not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  else
    -- Add owner_id if missing
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'settings' and column_name = 'owner_id') then
      alter table public.settings add column owner_id uuid not null default auth.uid();
    end if;
  end if;

  -- Drop any existing unique constraint
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.settings'::regclass
    and contype = 'u';

  if constraint_name is not null then
    execute format('alter table public.settings drop constraint %I', constraint_name);
  end if;
end $$;

-- Add proper unique constraint
alter table public.settings add constraint settings_org_id_owner_id_key_key unique (org_id, owner_id, key);

-- Enable RLS
alter table public.settings enable row level security;

-- Drop old policies
drop policy if exists "Users can manage settings" on public.settings;

-- Owner-only policy
create policy "settings_owner" on public.settings
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- updated_at trigger
drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();

-- Functions
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
