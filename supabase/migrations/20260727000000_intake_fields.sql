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
