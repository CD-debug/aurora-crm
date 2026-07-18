import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get dashboard metrics by querying directly
  const [
    { count: totalCases },
    { count: activeCases },
    { count: atRiskCases },
    { count: resolvedCases },
    { data: propertiesData },
    { data: resolvedClientsData }
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('author_id', user.id).neq('stage', 'resolved'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('health_status', 'at_risk'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('author_id', user.id).eq('stage', 'resolved'),
    supabase.from('properties')
      .select('value_eliminated, status')
      .eq('clients.author_id', user.id),
    supabase.from('clients')
      .select('case_opened_at')
      .eq('author_id', user.id)
      .eq('stage', 'resolved')
  ])

  // Calculate total debt eliminated (only paid_off properties)
  const totalDebtEliminated = propertiesData
    ?.filter(p => p.status === 'paid_off')
    .reduce((sum, p) => sum + (p.value_eliminated || 0), 0) || 0

  // Calculate properties under management (active properties)
  const propertiesUnderMgmt = propertiesData
    ?.filter(p => p.status === 'active')
    .length || 0

  // Calculate average time to resolution
  const avgTimeToResolution = resolvedClientsData && resolvedClientsData.length > 0
    ? resolvedClientsData.reduce((sum, c) => sum + (new Date().getTime() - new Date(c.case_opened_at).getTime()), 0) / resolvedClientsData.length
    : null

  const totalCasesCount = totalCases || 0
  const activeCasesCount = activeCases || 0
  const atRiskCasesCount = atRiskCases || 0
  const resolvedCasesCount = resolvedCases || 0
  const resolutionRate = totalCasesCount > 0 ? (resolvedCasesCount / totalCasesCount * 100) : 0

  return NextResponse.json({ metrics: {
    total_cases: totalCasesCount,
    active_cases: activeCasesCount,
    at_risk_cases: atRiskCasesCount,
    resolved_cases: resolvedCasesCount,
    total_debt_eliminated: totalDebtEliminated,
    properties_under_mgmt: propertiesUnderMgmt,
    avg_time_to_resolution: avgTimeToResolution,
    resolution_rate: resolutionRate,
  } })
}