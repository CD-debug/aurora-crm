-- Closing data: per-property settlement tracking for the Closing section.
-- 1:1 with properties (property_id PK with CASCADE delete).

create table if not exists public.closing_data (
  property_id uuid primary key references public.properties(id) on delete cascade,
  resort_settlement numeric(12,2),
  invoiced numeric(12,2),
  disposition text,
  updated_at text not null default (now()::text)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'closing_data_disposition_check') then
    alter table public.closing_data add constraint closing_data_disposition_check
      check (disposition is null or disposition in ('Sent', 'Collected', 'Settled', 'Paid'));
  end if;
end $$;
