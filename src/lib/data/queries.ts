// Server-side reads for Server Components (dashboard). Runs under RLS via
// the SSR client — the signed-in owner sees exactly their own rows.
// Interactive pages read through lib/data/client-queries.ts (browser + RLS).

import { createServerClient } from '@/lib/supabase/server'
import type { ClientWithHealth, DashboardData, PipelineStage, Property } from './types'
import { STAGES } from './domain'

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerClient()

  const [clientsRes, propsRes, recentRes] = await Promise.all([
    supabase
      .from('clients_with_health')
      .select('id, name, stage, health_status, case_opened_at, resolved_at, last_contact_at, overdue_task_count, is_unresponsive, current_annual_maintenance_fee'),
    supabase.from('properties').select('status'),
    supabase
      .from('recently_viewed')
      .select('client_id, viewed_at, clients!inner(name)')
      .order('viewed_at', { ascending: false })
      .limit(6),
  ])

  if (clientsRes.error) throw new Error(`Couldn't load dashboard metrics: ${clientsRes.error.message}`)
  if (propsRes.error) throw new Error(`Couldn't load dashboard metrics: ${propsRes.error.message}`)
  if (recentRes.error) throw new Error(`Couldn't load recently viewed: ${recentRes.error.message}`)

  const clients = clientsRes.data as Array<
    Pick<
      ClientWithHealth,
      'id' | 'name' | 'stage' | 'health_status' | 'case_opened_at' | 'resolved_at' | 'last_contact_at' | 'overdue_task_count' | 'is_unresponsive' | 'current_annual_maintenance_fee'
    >
  >
  const properties = propsRes.data as Array<Pick<Property, 'status'>>
  const recentlyViewed = (recentRes.data as Array<{ client_id: string; viewed_at: string; clients: { name: string } | { name: string }[] }>).map((r) => ({
    client_id: r.client_id,
    viewed_at: r.viewed_at,
    client_name: Array.isArray(r.clients) ? r.clients[0]?.name ?? '' : r.clients?.name ?? '',
  }))

  const stage_counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<PipelineStage, number>
  let unresponsive_count = 0
  for (const c of clients) {
    if (c.is_unresponsive) {
      unresponsive_count += 1
    } else {
      stage_counts[c.stage] += 1
    }
  }

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

  const total_debt_eliminated = resolved.reduce(
    (sum, c) => sum + Number(c.current_annual_maintenance_fee ?? 0),
    0,
  )
  const this_month_debt_eliminated = total_debt_eliminated

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
    unresponsive_count,
    recently_viewed: recentlyViewed.map((r) => ({
      client_id: r.client_id,
      client_name: r.client_name,
      viewed_at: r.viewed_at,
    })),
  }
}

