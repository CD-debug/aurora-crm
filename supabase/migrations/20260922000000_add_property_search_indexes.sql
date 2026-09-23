-- Add indexes for property search performance (Global Search)
create index if not exists idx_properties_resort_name on public.properties(resort_name);
create index if not exists idx_properties_resort_location on public.properties(resort_location);