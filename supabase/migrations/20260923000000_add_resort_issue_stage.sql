-- Add 'resort_issue' stage to client_stage enum (between exit_plan and in_progress)
-- PostgreSQL 10+ supports ADD VALUE ... AFTER
alter type public.client_stage add value 'resort_issue' after 'exit_plan';