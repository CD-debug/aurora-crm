-- Backfill any invalid property statuses to active
update public.properties
set status = 'active'
where status::text not in ('active', 'paid_off');

-- Idempotent status type fix — handles partial application from previous runs
do $$
begin
  -- If property_status_old still exists, the migration partially applied before
  if exists (select 1 from pg_type where typname = 'property_status_old') then
    -- Column might still reference the old type — cast through text
    alter table public.properties alter column status set data type public.property_status
      using status::text::public.property_status;
    drop type public.property_status_old;
  end if;

  -- Ensure the column is the right type and has a default
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'properties' and column_name = 'status'
      and udt_name = 'property_status'
  ) then
    alter table public.properties alter column status set data type public.property_status
      using status::text::public.property_status;
  end if;

  alter table public.properties alter column status set default 'active';
end $$;
