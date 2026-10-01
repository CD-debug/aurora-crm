'use client'

// Browser-side read fetchers, used with TanStack Query (PRD §5.1).
// All reads go through the browser Supabase client under RLS — the same
// rows the server sees, with shared query keys (query-keys.ts) so a
// mutation on any page refreshes every other view of the same record.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import type { Client360, ClientWithHealth, ClosingData, Disposition, Note, Property, Task, TaskWithClient, TeamMember } from './types'

export async function searchProperties(
  supabase: SupabaseClient,
  query: string
): Promise<(Property & { clients: { name: string } | null })[]> {
  const q = query.trim().replace(/[%,()]/g, '')
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('properties')
    .select('*, clients!inner(name)')
    .or(`resort_name.ilike.%${q}%,resort_location.ilike.%${q}%`)
    .order('resort_name', { ascending: true })
    .limit(10)
  if (error) throw new Error(`Property search failed: ${error.message}`)
  return data as (Property & { clients: { name: string } | null })[]
}

/**
 * Call after any successful server action: refreshes every client-side view
 * of the affected records (PRD §7.4). Server-rendered surfaces (dashboard)
 * are covered by the action's own revalidatePath.
 */
export function invalidateAfterMutation(queryClient: QueryClient, clientId?: string) {
  const keys: Array<readonly unknown[]> = [
    queryKeys.clients.all,
    queryKeys.tasks.all,
    queryKeys.teamMembers.all,
  ]
  if (clientId) keys.push(queryKeys.clients.detail(clientId))
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export async function fetchClients(supabase: SupabaseClient): Promise<ClientWithHealth[]> {
  const { data, error } = await supabase
    .from('clients_with_health')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(`Couldn't load clients: ${error.message}`)
  return data as ClientWithHealth[]
}

export async function searchClients(
  supabase: SupabaseClient,
  query: string
): Promise<ClientWithHealth[]> {
  const q = query.trim().replace(/[%,()]/g, '')
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('clients_with_health')
    .select('*')
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    .order('name', { ascending: true })
    .limit(8)
  if (error) throw new Error(`Search failed: ${error.message}`)
  return data as ClientWithHealth[]
}

export async function fetchClient360(supabase: SupabaseClient, clientId: string): Promise<Client360> {
  const [clientRes, propsRes, closingRes, notesRes, tasksRes] = await Promise.all([
    supabase.from('clients_with_health').select('*').eq('id', clientId).single(),
    supabase.from('properties').select('*').eq('client_id', clientId).order('created_at', { ascending: true }),
    supabase.from('closing_data').select('*, team_members(name)'),
    supabase.from('notes').select('*, team_members(name)').eq('client_id', clientId).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*, team_members(name)').eq('client_id', clientId).order('due_date', { ascending: true }),
  ])
  if (clientRes.error) throw new Error(`Couldn't load this client: ${clientRes.error.message}`)
  if (propsRes.error) throw new Error(`Couldn't load properties: ${propsRes.error.message}`)
  if (closingRes.error) throw new Error(`Couldn't load closing data: ${closingRes.error.message}`)
  if (notesRes.error) throw new Error(`Couldn't load notes: ${notesRes.error.message}`)
  if (tasksRes.error) throw new Error(`Couldn't load tasks: ${tasksRes.error.message}`)
  return {
    client: clientRes.data as ClientWithHealth,
    properties: propsRes.data as Property[],
    closingData: closingRes.data as ClosingData[],
    notes: notesRes.data as Note[],
    tasks: tasksRes.data as Task[],
  }
}

export async function fetchTeamMembers(supabase: SupabaseClient): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Couldn't load team members: ${error.message}`)
  return data as TeamMember[]
}

export async function fetchTasks(supabase: SupabaseClient): Promise<TaskWithClient[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, clients(name, state), team_members(name)')
    .order('due_date', { ascending: true })
  if (error) throw new Error(`Couldn't load tasks: ${error.message}`)
  return data as TaskWithClient[]
}

export interface ReceivableRow {
  property_id: string
  resort_name: string
  client_id: string
  client_name: string
  resort_settlement: number | null
  invoiced: number | null
  disposition: Disposition | null
  team_member_id: string | null
  team_member_name: string | null
  is_issued: boolean
}

export async function fetchReceivables(supabase: SupabaseClient): Promise<ReceivableRow[]> {
  const { data, error } = await supabase
    .from('closing_data')
    .select('*, properties!inner(resort_name, client_id, clients!inner(name)), team_members(name)')
    .not('resort_settlement', 'is', null)
    .order('resort_settlement', { ascending: false })
  if (error) throw new Error(`Couldn't load receivables: ${error.message}`)
  return (data as Array<Record<string, unknown> & { properties: { resort_name: string; client_id: string }; clients: { name: string }; team_members: { name: string } | null }>).map((row) => ({
    property_id: row.property_id as string,
    resort_name: row.properties.resort_name,
    client_id: row.properties.client_id,
    client_name: row.clients.name,
    resort_settlement: row.resort_settlement as number | null,
    invoiced: row.invoiced as number | null,
    disposition: row.disposition as Disposition | null,
    team_member_id: row.team_member_id as string | null,
    team_member_name: row.team_members?.name ?? null,
    is_issued: row.is_issued as boolean,
  }))
}
