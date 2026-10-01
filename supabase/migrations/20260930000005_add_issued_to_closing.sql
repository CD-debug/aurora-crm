alter table public.closing_data
  add column if not exists is_issued boolean not null default false;
