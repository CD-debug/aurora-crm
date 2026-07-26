create index if not exists idx_clients_tags on public.clients using gin(tags);
create index if not exists idx_clients_resolved_at on public.clients(resolved_at);
