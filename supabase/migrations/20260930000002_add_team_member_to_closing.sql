alter table public.closing_data
  add column if not exists team_member_id uuid references public.team_members(id);
