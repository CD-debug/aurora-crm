-- Enable RLS on all tables
alter table public.clients enable row level security;
alter table public.properties enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;

-- Owner-only policies (Phase 1: single user)
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

-- Updated_at trigger function
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

-- Dashboard metrics function
create or replace function public.get_dashboard_metrics(p_user_id uuid)
returns table (
  total_cases bigint,
  active_cases bigint,
  at_risk_cases bigint,
  resolved_cases bigint,
  total_debt_eliminated numeric,
  properties_under_mgmt bigint,
  avg_time_to_resolution interval,
  resolution_rate numeric
) language plpgsql security definer set search_path = public as $$
declare
  total bigint;
  active bigint;
  resolved bigint;
  at_risk bigint;
  debt numeric;
  props bigint;
  avg_days interval;
  rate numeric;
begin
  select count(*) into total from clients where author_id = p_user_id;
  
  select count(*) into active from clients 
    where author_id = p_user_id and stage != 'resolved';
  
  select count(*) into resolved from clients 
    where author_id = p_user_id and stage = 'resolved';
  
  select count(*) into at_risk from clients 
    where author_id = p_user_id and health_status = 'at_risk';
  
  select coalesce(sum(value_eliminated), 0) into debt
    from properties 
    join clients on properties.client_id = clients.id
    where clients.author_id = p_user_id and properties.status = 'paid_off';
  
  select count(*) into props from properties 
    join clients on properties.client_id = clients.id
    where clients.author_id = p_user_id and properties.status = 'active';
  
  select avg(now() - case_opened_at) into avg_days
    from clients
    where author_id = p_user_id and stage = 'resolved';
  
  rate := case when total > 0 then (resolved::numeric / total * 100) else 0 end;
  
  return query select total, active, at_risk, resolved, debt, props, avg_days, rate;
end $$;

grant execute on function public.get_dashboard_metrics(uuid) to authenticated;