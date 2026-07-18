-- Enable UUID extension (pgcrypto for gen_random_uuid)
create extension if not exists "pgcrypto";

-- Create custom enums first
create type public.client_stage as enum ('consultation', 'exit_plan', 'in_progress', 'resolved');
create type public.health_status as enum ('on_track', 'at_risk', 'stalled');
create type public.property_status as enum ('active', 'paid_off', 'foreclosed', 'relinquished');
create type public.note_channel as enum ('call', 'email', 'sms', 'meeting', 'internal');
create type public.task_status as enum ('pending', 'completed', 'overdue');

-- Clients table
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  state text not null,
  zip text not null,
  stage public.client_stage not null default 'consultation',
  stage_entered_at timestamptz not null default now(),
  case_opened_at timestamptz not null default now(),
  last_contact_at timestamptz,
  health_status public.health_status not null default 'on_track',
  assigned_rep_id uuid,
  tags text[] not null default '{}',
  author_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Properties table
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  resort_name text not null,
  resort_location text not null,
  unit_number text,
  purchase_price numeric(12,2),
  loan_balance numeric(12,2),
  maintenance_fee numeric(10,2),
  fee_due_date date,
  paid_off_at timestamptz,
  status public.property_status not null default 'active',
  document_reference text,
  value_eliminated numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes table
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null,
  channel public.note_channel not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null,
  title text not null,
  description text,
  due_date date not null,
  due_time time,
  status public.task_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_clients_author_id on public.clients(author_id);
create index idx_clients_stage on public.clients(stage);
create index idx_clients_health on public.clients(health_status);
create index idx_clients_name on public.clients(name);
create index idx_clients_phone on public.clients(phone);
create index idx_clients_email on public.clients(email);

create index idx_properties_client_id on public.properties(client_id);
create index idx_properties_status on public.properties(status);

create index idx_notes_client_id on public.notes(client_id);
create index idx_notes_created_at on public.notes(created_at desc);

create index idx_tasks_client_id on public.tasks(client_id);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_author_id on public.tasks(author_id);