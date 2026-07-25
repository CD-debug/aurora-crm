// Pure domain derivations. No I/O — unit-tested in domain.test.ts.
// Anything shown to the user as a statistic is computed here or in the
// clients_with_health view, never stored by hand (PRD design principle 3).

import type {
  Client,
  ClientWithHealth,
  PipelineStage,
  Property,
  Task,
  TaskStatus,
} from './types'

export const STAGES: readonly PipelineStage[] = [
  'consultation',
  'exit_plan',
  'in_progress',
  'resolved',
] as const

export const STAGE_LABELS: Record<PipelineStage, string> = {
  consultation: 'Consultation',
  exit_plan: 'Exit Plan',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export const HEALTH_LABELS = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  stalled: 'Stalled',
} as const

export function stageIndex(stage: PipelineStage): number {
  return STAGES.indexOf(stage)
}

/** Percent of the pipeline arc filled at this stage (0 / 33 / 67 / 100). */
export function stagePercent(stage: PipelineStage): number {
  return Math.round((stageIndex(stage) / (STAGES.length - 1)) * 100)
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** Task status is derived from due_date + completed_at. Never stored. */
export function taskStatus(
  task: Pick<Task, 'due_date' | 'completed_at'>,
  now: Date = new Date()
): TaskStatus {
  if (task.completed_at) return 'completed'
  const due = startOfDay(new Date(task.due_date + 'T00:00:00'))
  return due < startOfDay(now) ? 'overdue' : 'upcoming'
}

/** Due within the next 3 days (and not overdue/completed). */
export function isDueSoon(
  task: Pick<Task, 'due_date' | 'completed_at'>,
  now: Date = new Date()
): boolean {
  if (taskStatus(task, now) !== 'upcoming') return false
  const due = startOfDay(new Date(task.due_date + 'T00:00:00'))
  const ms = due.getTime() - startOfDay(now).getTime()
  return ms <= 3 * 24 * 60 * 60 * 1000
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
}

export interface FinancialProgress {
  /** Sum of loan balances on properties still owed (status 'active'). */
  owed: number
  /** Sum of value eliminated (falls back to loan balance) on paid-off properties. */
  eliminated: number
  /** eliminated / (owed + eliminated) * 100, 0 when nothing is tracked. */
  percent: number
}

export function financialProgress(properties: Property[]): FinancialProgress {
  let owed = 0
  let eliminated = 0
  for (const p of properties) {
    if (p.status === 'paid_off') {
      eliminated += Number(p.value_eliminated ?? p.loan_balance ?? 0)
    } else if (p.status === 'active') {
      owed += Number(p.loan_balance ?? 0)
    }
  }
  const total = owed + eliminated
  return { owed, eliminated, percent: total > 0 ? Math.round((eliminated / total) * 100) : 0 }
}

/** Digits-only phone normalization for duplicate matching. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
}

/**
 * Basic duplicate detection (PRD §10): a candidate duplicates an existing
 * client when email matches (case-insensitive), phone digits match, or the
 * full name matches exactly (case-insensitive).
 */
export function findDuplicates<T extends Pick<Client, 'id' | 'name' | 'email' | 'phone'>>(
  existing: T[],
  candidate: { name: string; email: string; phone: string },
  excludeId?: string
): T[] {
  const name = candidate.name.trim().toLowerCase()
  const email = candidate.email.trim().toLowerCase()
  const phone = normalizePhone(candidate.phone)
  return existing.filter((c) => {
    if (excludeId && c.id === excludeId) return false
    if (email && c.email.trim().toLowerCase() === email) return true
    if (phone && normalizePhone(c.phone) === phone) return true
    if (name && c.name.trim().toLowerCase() === name) return true
    return false
  })
}

/** Directory filter state lives in the URL (PRD §7.3); this applies it. */
export interface ClientFilters {
  search?: string
  health?: string
  state?: string
  stage?: string // a stage, or 'active' (= not resolved)
  tag?: string
}

export function filterClients<T extends ClientWithHealth>(
  clients: T[],
  filters: ClientFilters
): T[] {
  const search = filters.search?.trim().toLowerCase()
  return clients.filter((c) => {
    if (search) {
      const hay = `${c.name} ${c.phone} ${c.email}`.toLowerCase()
      if (!hay.includes(search)) return false
    }
    if (filters.health && c.health_status !== filters.health) return false
    if (filters.state && c.state !== filters.state) return false
    if (filters.tag && !c.tags.includes(filters.tag)) return false
    if (filters.stage) {
      if (filters.stage === 'active') {
        if (c.stage === 'resolved') return false
      } else if (c.stage !== filters.stage) {
        return false
      }
    }
    return true
  })
}
