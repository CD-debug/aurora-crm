-- Seed default theme = light for the single owner-operator
-- Uses the existing settings RPC pattern (key/value jsonb on public.settings)
insert into public.settings (org_id, owner_id, key, value, updated_at)
values ('default', auth.uid(), 'theme', '"light"'::jsonb, now())
on conflict (org_id, owner_id, key) do nothing;
