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