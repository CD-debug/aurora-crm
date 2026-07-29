import { createServerClient } from '@/lib/supabase/server'

export async function getReportData() {
  const supabase = await createServerClient()

  const [{ data: clients }, { data: tasks }, { data: properties }, { data: notes }, { data: teamMembers }] = await Promise.all([
    supabase.from('clients').select('id, stage, health_status, state, created_at'),
    supabase.from('tasks').select('id, due_date, completed_at, created_at, staff_id'),
    supabase.from('properties').select('id, status, purchase_price, loan_balance'),
    supabase.from('notes').select('id, staff_id, created_at'),
    supabase.from('team_members').select('id, name').order('name', { ascending: true }),
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

  // Per-team-member activity
  type ActivityRow = { id: string; name: string; notes: number; tasksTotal: number; tasksCompleted: number; lastActive: string | null }
  const byMember: ActivityRow[] = []
  const unassignedActivity: ActivityRow = { id: 'unassigned', name: 'Unassigned', notes: 0, tasksTotal: 0, tasksCompleted: 0, lastActive: null }

  for (const member of teamMembers ?? []) {
    const mid = member.id
    const memberNotes = (notes ?? []).filter((n) => n.staff_id === mid)
    const memberTasks = (tasks ?? []).filter((t) => t.staff_id === mid)
    const allDates = [
      ...memberNotes.map((n) => n.created_at),
      ...memberTasks.map((t) => t.created_at),
    ].filter(Boolean) as string[]
    byMember.push({
      id: mid,
      name: member.name,
      notes: memberNotes.length,
      tasksTotal: memberTasks.length,
      tasksCompleted: memberTasks.filter((t) => t.completed_at).length,
      lastActive: allDates.length > 0 ? allDates.sort().reverse()[0] : null,
    })
  }
  // Collect any rows attributed to members that no longer exist
  const knownIds = new Set((teamMembers ?? []).map((m) => m.id))
  unassignedActivity.notes = (notes ?? []).filter((n) => !n.staff_id || !knownIds.has(n.staff_id)).length
  unassignedActivity.tasksTotal = (tasks ?? []).filter((t) => !t.staff_id || !knownIds.has(t.staff_id)).length
  unassignedActivity.tasksCompleted = (tasks ?? []).filter((t) => (t.completed_at) && (!t.staff_id || !knownIds.has(t.staff_id))).length

  // Sort by total activity desc
  byMember.sort((a, b) => (b.notes + b.tasksTotal) - (a.notes + a.tasksTotal))

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
    teamActivity: byMember,
    unassignedActivity,
  }
}
