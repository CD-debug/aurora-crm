-- Add 'hold' stage to client_stage enum (between consultation and exit_plan)
alter type public.client_stage add value 'hold' after 'consultation';