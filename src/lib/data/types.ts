// Single source of truth for Aurora's domain model.
// Mirrors the Supabase schema (snake_case, as returned by supabase-js).
// Derived values (health, last contact, task status) are COMPUTED —
// see the clients_with_health view and lib/data/domain.ts. Never stored by hand.

export type PipelineStage = 'consultation' | 'exit_plan' | 'in_progress' | 'resolved'
export type HealthStatus = 'on_track' | 'at_risk' | 'stalled'
export type TaskStatus = 'upcoming' | 'overdue' | 'completed' // derived, never stored
export type NoteChannel = 'email' | 'phone' | 'text'
export type PropertyStatus = 'active' | 'paid_off'

export interface TeamMember {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export interface Client {
  id: string
  author_id: string
  name: string
  phone: string
  email: string
  state: string
  zip: string
  stage: PipelineStage
  stage_entered_at: string
  case_opened_at: string
  resolved_at: string | null
  assigned_rep_id: string | null // reserved for Phase 4 multi-user
  tags: string[]
  created_at: string
  updated_at: string
  // Intake fields (20260727 migration) — nullable; filled over time, never required
  dob: string | null
  ssn_last4: string | null
  co_client_name: string | null
  address: string | null
  phone2: string | null
  retainer_fee: number | null
}

/** Row of the clients_with_health view: Client + computed fields. */
export interface ClientWithHealth extends Client {
  last_contact_at: string | null // max(notes.created_at)
  open_task_count: number
  overdue_task_count: number
  next_task_due: string | null // nearest open task due date (today or later)
  health_status: HealthStatus
}

export interface Property {
  id: string
  client_id: string
  resort_name: string
  resort_location: string
  unit_number: string | null
  purchase_price: number | null
  loan_balance: number | null
  maintenance_fee: number | null
  fee_due_date: string | null
  paid_off_at: string | null
  status: PropertyStatus
  document_reference: string | null
  value_eliminated: number | null
  created_at: string
  updated_at: string
  // Intake fields (20260727 migration) — nullable
  usage_frequency: 'annual' | 'biennial' | 'odd_year' | 'even_year' | null
  usage_type: 'fixed_week' | 'floating_week' | 'points_based' | null
  fees_current: boolean
  fees_behind_amount: number | null
  maintenance_fees_billed: number | null
}

export interface Note {
  id: string
  client_id: string
  author_id: string
  staff_id: string | null
  channel: NoteChannel
  content: string
  pinned: boolean
  created_at: string
  updated_at: string | null
  team_members: { name: string } | null
}

export interface Task {
  id: string
  client_id: string
  author_id: string
  staff_id: string | null
  title: string
  description: string | null
  due_date: string // ISO date (yyyy-mm-dd)
  due_time: string | null
  completed_at: string | null
  created_at: string
  team_members: { name: string } | null
}

export interface TaskWithClient extends Task {
  clients: { name: string; state: string } | null
}

/** Everything the Client 360 workspace needs, fetched as one unit. */
export interface Client360 {
  client: ClientWithHealth
  properties: Property[]
  notes: Note[]
  tasks: Task[]
}

export interface DashboardData {
  total_cases: number
  active_cases: number
  at_risk_cases: number
  stalled_cases: number
  resolved_cases: number
  total_debt_eliminated: number
  properties_under_mgmt: number
  avg_days_to_resolution: number | null
  resolution_rate: number
  stage_counts: Record<PipelineStage, number>
  attention: Array<{
    id: string
    name: string
    health_status: HealthStatus
    stage: PipelineStage
    last_contact_at: string | null
    overdue_task_count: number
  }>
}
