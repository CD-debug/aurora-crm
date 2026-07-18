import { createServerSupabaseClient } from '@/lib/supabase/server'
import { queryKeys } from './query-keys'

export async function getClients(filters?: Record<string, string>) {
  const supabase = createServerSupabaseClient()
  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.health) {
    query = query.eq('health_status', filters.health)
  }
  if (filters?.state) {
    query = query.eq('state', filters.state)
  }
  if (filters?.stage) {
    query = query.eq('stage', filters.stage)
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getClientById(id: string) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getClientWithRelations(id: string) {
  const supabase = createServerSupabaseClient()
  
  const [{ data: client }, { data: properties }, { data: notes }, { data: tasks }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('properties').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('notes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('client_id', id).order('due_date', { ascending: true }),
  ])

  if (!client) throw new Error('Client not found')

  return { client, properties: properties || [], notes: notes || [], tasks: tasks || [] }
}

export async function getTasks(filters?: { clientId?: string; status?: string; dueDate?: string }) {
  const supabase = createServerSupabaseClient()
  let query = supabase.from('tasks').select('*, clients(name)').order('due_date', { ascending: true })

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.dueDate) {
    query = query.eq('due_date', filters.dueDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getDashboardMetrics() {
  const supabase = createServerSupabaseClient()
  
  const [
    { count: totalCases },
    { count: activeCases },
    { count: atRiskCases },
    { count: resolvedCases },
    { data: propertiesData },
    { data: resolvedClientsData }
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }).neq('stage', 'resolved'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('health_status', 'at_risk'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('stage', 'resolved'),
    supabase.from('properties').select('value_eliminated, status'),
    supabase.from('clients').select('case_opened_at').eq('stage', 'resolved')
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
  const resolvedCasesCount = resolvedCases || 0
  const resolutionRate = totalCasesCount > 0 ? (resolvedCasesCount / totalCasesCount * 100) : 0

  return {
    total_cases: totalCasesCount,
    active_cases: activeCases || 0,
    at_risk_cases: atRiskCases || 0,
    resolved_cases: resolvedCasesCount,
    total_debt_eliminated: totalDebtEliminated,
    properties_under_mgmt: propertiesUnderMgmt,
    avg_time_to_resolution: avgTimeToResolution,
    resolution_rate: resolutionRate,
  }
}