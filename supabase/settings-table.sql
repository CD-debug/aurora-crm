-- Optional follow-up: Settings table (used by Settings page)
-- Paste this into https://supabase.com/dashboard/project/zkjytbnalmzmfxjkrhmn/sql
-- Settings page won't break hard without it (it'll just show empty fields), but
-- CSV import tracking + lead ingestion API key live here.

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'default',
  owner_id uuid not null default auth.uid(),
  key text not null,
  value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings
  drop constraint if exists settings_org_id_owner_id_key_key;
alter table public.settings
  add constraint settings_org_id_owner_id_key_key unique (org_id, owner_id, key);

alter table public.settings enable row level security;

drop policy if exists "settings_owner" on public.settings;
create policy "settings_owner" on public.settings
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();

create or replace function public.update_settings(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (org_id, owner_id, key, value, updated_at)
  values ('default', auth.uid(), p_key, p_value, now())
  on conflict (org_id, owner_id, key)
  do update set value = p_value, updated_at = now();
end;
$$;

create or replace function public.get_settings(p_key text)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(value, '{}'::jsonb)
  from public.settings
  where org_id = 'default' and key = p_key and owner_id = auth.uid();
$$;

create or replace function public.regenerate_api_key()
returns text language plpgsql security definer set search_path = public as $$
declare new_key text;
begin
  new_key := 'aurora_' || encode(gen_random_bytes(32), 'hex');
  insert into public.settings (org_id, owner_id, key, value, updated_at)
  values ('default', auth.uid(), 'lead_ingestion',
    jsonb_build_object('enabled', true, 'api_key', new_key), now())
  on conflict (org_id, owner_id, key)
  do update set value = public.settings.value || jsonb_build_object('api_key', new_key), updated_at = now();
  return new_key;
end;
$$;

grant execute on function public.update_settings(text, jsonb) to authenticated;
grant execute on function public.get_settings(text) to authenticated;
grant execute on function public.regenerate_api_key() to authenticated;
