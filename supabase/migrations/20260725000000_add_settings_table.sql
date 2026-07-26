create table settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default 'default',
  key text not null,
  value jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, key)
);

alter table settings enable row level security;

create policy "Users can manage settings" on settings
  for all
  using (org_id = 'default')
  with check (org_id = 'default');

-- Default settings row
insert into settings (key, value) values
  ('general', '{"company_name": "Aurora CRM"}'),
  ('lead_ingestion', '{"enabled": false, "api_key": null, "webhook_url": null}'),
  ('csv_import', '{"last_import_at": null, "total_imported": 0}');

-- Update function
create or replace function update_settings(
  p_key text,
  p_value jsonb
)
returns void as $$
begin
  insert into settings (key, value, updated_at)
  values ('default', p_key, p_value, now())
  on conflict (org_id, key)
  do update set value = p_value, updated_at = now();
end;
$$ language plpgsql security definer;

-- Get settings function
create or replace function get_settings(p_key text)
returns jsonb as $$
  select coalesce(value, '{}'::jsonb) from settings where org_id = 'default' and key = p_key;
$$ language sql security definer;

-- Generate API key function
create or replace function regenerate_api_key()
returns text as $$
declare
  new_key text;
begin
  new_key := 'aurora_' || encode(gen_random_bytes(32), 'hex');
  update settings set value = jsonb_set(value, '{api_key}', to_jsonb(new_key)), updated_at = now()
  where org_id = 'default' and key = 'lead_ingestion';
  return new_key;
end;
$$ language plpgsql security definer;
