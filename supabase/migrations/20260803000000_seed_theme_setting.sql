-- Seed default theme = light for the single owner-operator.
-- auth.uid() is null during migrations, so look up the first auth user
-- (single-user MVP — see PRD §3). If no user exists yet, the row is skipped;
-- the app's getTheme() resolver falls back to 'light' in that case.
insert into public.settings (org_id, owner_id, key, value, updated_at)
select 'default', u.id, 'theme', '"light"'::jsonb, now()
from auth.users u
order by u.created_at asc
limit 1
on conflict (org_id, owner_id, key) do nothing;
