-- Recently Viewed: last 6 Client 360 visits per user
-- Single user now, multi-user ready with user_id

create table if not exists public.recently_viewed (
  user_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, client_id)
);

create index if not exists recently_viewed_user_viewed_at_idx
  on public.recently_viewed (user_id, viewed_at desc);

create or replace function public.trim_recently_viewed()
returns trigger
language plpgsql
as $$
begin
  delete from public.recently_viewed
  where user_id = NEW.user_id
  and client_id not in (
    select client_id from public.recently_viewed
    where user_id = NEW.user_id
    order by viewed_at desc
    limit 5
  );
  return NEW;
end $$;

drop trigger if exists trim_recently_viewed on public.recently_viewed;
create trigger trim_recently_viewed
after insert on public.recently_viewed
for each row execute function public.trim_recently_viewed();

alter table public.recently_viewed enable row level security;

create policy "own_recently_viewed" on public.recently_viewed
  for all using (user_id = auth.uid());