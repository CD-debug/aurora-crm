-- Backfill any invalid property statuses to active
update public.properties
set status = 'active'
where status not in ('active', 'paid_off');

-- Shrink the enum to match the PRD and TypeScript
alter type public.property_status rename to property_status_old;

create type public.property_status as enum ('active', 'paid_off');

alter table public.properties
  alter column status drop default,
  alter column status type text,
  alter column status type public.property_status using status::public.property_status,
  alter column status set default 'active';

drop type public.property_status_old;
