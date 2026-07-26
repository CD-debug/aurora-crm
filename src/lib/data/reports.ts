import { createServerClient } from '@/lib/supabase/server'

export async function getReportData() {
  const supabase = await createServerClient()

  const [{ data: clients }, { data: tasks }, { data: properties }] = await Promise.all([
    supabase.from('clients').select('id, stage, health_status, state, created_at'),
    supabase.from('tasks').select('id, due_date, completed_at, created_at'),
    supabase.from('properties').select('id, status, purchase_price, loan_balance'),
  ])

  const totalClients = clients?.length ?? 0
  const totalTasks = tasks?.length ?? 0
  const overdueTasks = tasks?.filter(t => !t.completed_at && t.due_date && new Date(t.due_date) < new Date()).length ?? 0
  const completedTasks = tasks?.filter(t => t.completed_at).length ?? 0

  const byStage = [
    { stage: 'Consultation', count: clients?.filter(c => c.stage === 'consultation').length ?? 0 },
    { stage: 'Exit Plan', count: clients?.filter(c => c.stage === 'exit_plan').length ?? 0 },
    { stage: 'In Progress', count: clients?.filter(c => c.stage === 'in_progress').length ?? 0 },
    { stage: 'Resolved', count: clients?.filter(c => c.stage === 'resolved').length ?? 0 },
  ]

  const byHealth = [
    { label: 'On Track', count: clients?.filter(c => c.health_status === 'on_track').length ?? 0, color: 'var(--chart-1)' },
    { label: 'At Risk', count: clients?.filter(c => c.health_status === 'at_risk').length ?? 0, color: 'var(--chart-4)' },
    { label: 'Stalled', count: clients?.filter(c => c.health_status === 'stalled').length ?? 0, color: 'var(--chart-3)' },
  ]

  const byState: { state: string; count: number }[] = Object.entries(
    (clients ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c.state] = (acc[c.state] ?? 0) + 1
      return acc
    }, {})
  )
    .map(([state, count]) => ({ state, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const totalPurchasePrice = properties?.reduce((sum, p) => sum + (p.purchase_price ?? 0), 0) ?? 0
  const totalLoanBalance = properties?.reduce((sum, p) => sum + (p.loan_balance ?? 0), 0) ?? 0

  return {
    totalClients,
    totalTasks,
    overdueTasks,
    completedTasks,
    byStage,
    byHealth,
    byState,
    totalPurchasePrice,
    totalLoanBalance,
    activeProperties: properties?.filter(p => p.status === 'active').length ?? 0,
    paidOffProperties: properties?.filter(p => p.status === 'paid_off').length ?? 0,
  }
}
