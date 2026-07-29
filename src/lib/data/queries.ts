// Server-side reads for Server Components (dashboard). Runs under RLS via
// the SSR client — the signed-in owner sees exactly their own rows.
// Interactive pages read through lib/data/client-queries.ts (browser + RLS).

import { createServerClient } from '@/lib/supabase/server'
import type { ClientWithHealth, DashboardData, PipelineStage, Property } from './types'
import { STAGES } from './domain'

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerClient()

  const [clientsRes, propsRes] = await Promise.all([
    supabase
      .from('clients_with_health')
      .select('id, name, stage, health_status, case_opened_at, resolved_at, last_contact_at, overdue_task_count'),
    supabase.from('properties').select('status, value_eliminated, loan_balance, paid_off_at'),
  ])

  if (clientsRes.error) throw new Error(`Couldn't load dashboard metrics: ${clientsRes.error.message}`)
  if (propsRes.error) throw new Error(`Couldn't load dashboard metrics: ${propsRes.error.message}`)

  const clients = clientsRes.data as Array<
    Pick<
      ClientWithHealth,
      'id' | 'name' | 'stage' | 'health_status' | 'case_opened_at' | 'resolved_at' | 'last_contact_at' | 'overdue_task_count'
    >
  >
  const properties = propsRes.data as Array<Pick<Property, 'status' | 'value_eliminated' | 'loan_balance' | 'paid_off_at'>>

  const stage_counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<PipelineStage, number>
  for (const c of clients) stage_counts[c.stage] += 1

  const resolved = clients.filter((c) => c.stage === 'resolved')
  const withResolutionTime = resolved.filter((c) => c.resolved_at)
  const avgDays =
    withResolutionTime.length > 0
      ? withResolutionTime.reduce(
          (sum, c) =>
            sum + (new Date(c.resolved_at!).getTime() - new Date(c.case_opened_at).getTime()),
          0
        ) /
        withResolutionTime.length /
        (24 * 60 * 60 * 1000)
      : null

  // Real "this month" debt eliminated — sum paid-off properties where paid_off_at is in the trailing 30 days
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const paidOffProps = properties.filter((p) => p.status === 'paid_off')
  const total_debt_eliminated = paidOffProps.reduce(
    (sum, p) => sum + Number(p.value_eliminated ?? p.loan_balance ?? 0),
    0,
  )
  const this_month_debt_eliminated = paidOffProps
    .filter((p) => p.paid_off_at && now - new Date(p.paid_off_at).getTime() <= thirtyDaysMs)
    .reduce((sum, p) => sum + Number(p.value_eliminated ?? p.loan_balance ?? 0), 0)

  return {
    total_cases: clients.length,
    active_cases: clients.filter((c) => c.stage !== 'resolved').length,
    at_risk_cases: clients.filter((c) => c.health_status === 'at_risk').length,
    stalled_cases: clients.filter((c) => c.health_status === 'stalled').length,
    resolved_cases: resolved.length,
    total_debt_eliminated,
    this_month_debt_eliminated,
    properties_under_mgmt: properties.filter((p) => p.status === 'active').length,
    avg_days_to_resolution: avgDays,
    resolution_rate: clients.length > 0 ? (resolved.length / clients.length) * 100 : 0,
    stage_counts,
    attention: clients
      .filter((c) => c.health_status !== 'on_track')
      .sort((a, b) => (a.health_status === b.health_status ? 0 : a.health_status === 'stalled' ? -1 : 1))
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        name: c.name,
        health_status: c.health_status,
        stage: c.stage,
        last_contact_at: c.last_contact_at,
        overdue_task_count: c.overdue_task_count,
      })),
  }
}

