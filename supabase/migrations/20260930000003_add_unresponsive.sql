alter table public.clients
  add column if not exists is_unresponsive boolean not null default false,
  add column if not exists unresponsive_since timestamptz;
