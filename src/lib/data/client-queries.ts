'use client'

// Browser-side read fetchers, used with TanStack Query (PRD §5.1).
// All reads go through the browser Supabase client under RLS — the same
// rows the server sees, with shared query keys (query-keys.ts) so a
// mutation on any page refreshes every other view of the same record.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import type { Client360, ClientWithHealth, Note, NoteAuthor, Property, Task, TaskWithClient } from './types'

/**
 * Call after any successful server action: refreshes every client-side view
 * of the affected records (PRD §7.4). Server-rendered surfaces (dashboard)
 * are covered by the action's own revalidatePath.
 */
export function invalidateAfterMutation(queryClient: QueryClient, clientId?: string) {
  const keys: Array<readonly unknown[]> = [queryKeys.clients.all, queryKeys.tasks.all]
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
  const [clientRes, propsRes, notesRes, tasksRes] = await Promise.all([
    supabase.from('clients_with_health').select('*').eq('id', clientId).single(),
    supabase.from('properties').select('*').eq('client_id', clientId).order('created_at', { ascending: true }),
    supabase.from('notes').select('*, note_authors(name)').eq('client_id', clientId).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('client_id', clientId).order('due_date', { ascending: true }),
  ])
  if (clientRes.error) throw new Error(`Couldn't load this client: ${clientRes.error.message}`)
  if (propsRes.error) throw new Error(`Couldn't load properties: ${propsRes.error.message}`)
  if (notesRes.error) throw new Error(`Couldn't load notes: ${notesRes.error.message}`)
  if (tasksRes.error) throw new Error(`Couldn't load tasks: ${tasksRes.error.message}`)
  return {
    client: clientRes.data as ClientWithHealth,
    properties: propsRes.data as Property[],
    notes: notesRes.data as Note[],
    tasks: tasksRes.data as Task[],
  }
}

export async function fetchNoteAuthors(supabase: SupabaseClient): Promise<NoteAuthor[]> {
  const { data, error } = await supabase
    .from('note_authors')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Couldn't load note authors: ${error.message}`)
  return data as NoteAuthor[]
}

export async function fetchTasks(supabase: SupabaseClient): Promise<TaskWithClient[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, clients(name, state)')
    .order('due_date', { ascending: true })
  if (error) throw new Error(`Couldn't load tasks: ${error.message}`)
  return data as TaskWithClient[]
}
