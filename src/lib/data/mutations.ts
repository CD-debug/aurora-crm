'use server'

// The ONE write path for Aurora (PRD §5.1): Server Actions over the SSR
// Supabase client. RLS enforces ownership; every action still verifies the
// session and validates input at the trust boundary. revalidatePath keeps
// server-rendered surfaces (dashboard) fresh; callers also invalidate the
// matching TanStack Query keys (PRD §7.4).

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { findDuplicates } from './domain'
import { clientInput } from './schemas'
import type { Client, Note, TeamMember, PipelineStage, Property, Task } from './types'

export async function requireUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('You need to be signed in to do that.')
  return { supabase, userId: user.id }
}

function revalidate(clientId?: string) {
  revalidatePath('/')
  revalidatePath('/clients')
  revalidatePath('/tasks')
  if (clientId) revalidatePath(`/clients/${clientId}`)
}

function fail(error: { message: string }): never {
  throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export type CreateClientResult =
  | { status: 'created'; client: Client }
  | { status: 'duplicates'; matches: Array<Pick<Client, 'id' | 'name' | 'email' | 'phone'>> }

export async function createClientRecord(
  input: z.input<typeof clientInput>,
  opts?: { allowDuplicate?: boolean }
): Promise<CreateClientResult> {
  const { supabase, userId } = await requireUser()
  const data = clientInput.parse(input)

  if (!opts?.allowDuplicate) {
    const { data: existing, error } = await supabase
      .from('clients')
      .select('id, name, email, phone')
    if (error) fail(error)
    const matches = findDuplicates(existing ?? [], data)
    if (matches.length > 0) return { status: 'duplicates', matches }
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ ...data, tags: data.tags ?? [], author_id: userId })
    .select()
    .single()
  if (error) fail(error)

  revalidate(client.id)
  return { status: 'created', client: client as Client }
}

export async function updateClient(clientId: string, input: z.input<typeof clientInput>) {
  const { supabase } = await requireUser()
  const data = clientInput.parse(input)

  const { error } = await supabase.from('clients').update(data).eq('id', clientId)
  if (error) fail(error)
  revalidate(clientId)
}

const stageInput = z.enum(['consultation', 'exit_plan', 'in_progress', 'resolved'])

export async function updateClientStage(clientId: string, stage: PipelineStage) {
  const { supabase } = await requireUser()
  const parsed = stageInput.parse(stage)

  // Only the stage is sent — the DB trigger stamps stage_entered_at and
  // resolved_at so transitions can't be mis-recorded from a browser clock.
  const { error } = await supabase.from('clients').update({ stage: parsed }).eq('id', clientId)
  if (error) fail(error)
  revalidate(clientId)
}

export async function deleteClient(clientId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) fail(error)
  revalidate()
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

const money = z.coerce.number().finite().nonnegative().nullable().optional()
const propertyInput = z.object({
  client_id: z.string().uuid(),
  resort_name: z.string().trim().min(1, 'Resort name is required').max(255),
  resort_location: z.string().trim().min(1, 'Location is required').max(255),
  unit_number: z.string().trim().max(100).nullable().optional(),
  purchase_price: money,
  loan_balance: money,
  maintenance_fee: money,
  fee_due_date: z.iso.date().nullable().optional(),
  // Intake fields — optional (existing properties have nulls)
  usage_frequency: z.enum(['annual', 'biennial', 'odd_year', 'even_year']).nullable().optional(),
  usage_type: z.enum(['fixed_week', 'floating_week', 'points_based']).nullable().optional(),
  fees_current: z.boolean().optional(),
  fees_behind_amount: money,
  maintenance_fees_billed: money,
  status: z.enum(['active', 'paid_off']).optional(),
  document_reference: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .refine(
      (v) => !v || v.startsWith('http://') || v.startsWith('https://'),
      { message: 'Document reference must be a valid URL starting with http:// or https://' }
    ),
})

export async function createProperty(input: z.input<typeof propertyInput>) {
  const { supabase } = await requireUser()
  const data = propertyInput.parse(input)

  const { data: property, error } = await supabase
    .from('properties')
    .insert(data)
    .select()
    .single()
  if (error) fail(error)
  revalidate(data.client_id)
  return property as Property
}

export async function updateProperty(propertyId: string, clientId: string, input: z.input<typeof propertyInput>) {
  const { supabase } = await requireUser()
  const { client_id: _omit, ...updates } = propertyInput.parse(input)

  const { error } = await supabase.from('properties').update(updates).eq('id', propertyId)
  if (error) fail(error)
  revalidate(clientId)
}

/** PRD §11.2 paid-off Yes/No toggle. Eliminated value defaults to the loan balance. */
export async function setPropertyPaidOff(
  propertyId: string,
  clientId: string,
  paidOff: boolean,
  valueEliminated?: number | null
) {
  const { supabase } = await requireUser()

  let eliminated = valueEliminated ?? null
  if (paidOff && eliminated == null) {
    const { data: prop, error } = await supabase
      .from('properties')
      .select('loan_balance')
      .eq('id', propertyId)
      .single()
    if (error) fail(error)
    if (prop?.loan_balance == null) {
      throw new Error('Add a loan balance before marking this property paid off.')
    }
    eliminated = Number(prop.loan_balance)
  }

  const { error } = await supabase
    .from('properties')
    .update(
      paidOff
        ? { status: 'paid_off', paid_off_at: new Date().toISOString(), value_eliminated: eliminated }
        : { status: 'active', paid_off_at: null, value_eliminated: null }
    )
    .eq('id', propertyId)
  if (error) fail(error)
  revalidate(clientId)
}

export async function deleteProperty(propertyId: string, clientId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('properties').delete().eq('id', propertyId)
  if (error) fail(error)
  revalidate(clientId)
}

// ---------------------------------------------------------------------------
// Notes (PRD §11.3 — channel is one of email / phone / text)
// ---------------------------------------------------------------------------

const noteInput = z.object({
  client_id: z.string().uuid(),
  channel: z.enum(['email', 'phone', 'text']),
  content: z.string().trim().min(1, "Can't save an empty note").max(5000),
  staff_id: z.string().uuid().nullable().optional(),
})

export async function createNote(input: z.input<typeof noteInput>) {
  const { supabase, userId } = await requireUser()
  const data = noteInput.parse(input)

  const { data: note, error } = await supabase
    .from('notes')
    .insert({ ...data, author_id: userId, staff_id: data.staff_id ?? null })
    .select('*, team_members(name)')
    .single()
  if (error) fail(error)
  revalidate(data.client_id)
  return note as Note
}

export async function updateNote(noteId: string, clientId: string, content: string) {
  const { supabase } = await requireUser()
  const trimmed = content.trim()
  if (!trimmed) throw new Error("Can't save an empty note")

  const { error } = await supabase
    .from('notes')
    .update({ content: trimmed, updated_at: new Date().toISOString() })
    .eq('id', noteId)
  if (error) fail(error)
  revalidate(clientId)
}

export async function toggleNotePin(noteId: string, clientId: string, pinned: boolean) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('notes').update({ pinned }).eq('id', noteId)
  if (error) fail(error)
  revalidate(clientId)
}

export async function deleteNote(noteId: string, clientId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('notes').delete().eq('id', noteId)
  if (error) fail(error)
  revalidate(clientId)
}

// ---------------------------------------------------------------------------
// Team Members — named people for attribution across notes, tasks, etc.
// (single-login env — these are display names, not auth accounts)
// ---------------------------------------------------------------------------

const memberInput = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
})

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('name', { ascending: true })
  if (error) fail(error)
  return data as TeamMember[]
}

export async function createTeamMember(name: string): Promise<TeamMember> {
  const { supabase, userId } = await requireUser()
  const data = memberInput.parse({ name })
  const { data: member, error } = await supabase
    .from('team_members')
    .insert({ ...data, owner_id: userId })
    .select()
    .single()
  if (error) fail(error)
  return member as TeamMember
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) fail(error)
}

// ---------------------------------------------------------------------------
// Tasks — one shared record surfaced on Client 360 and the Tasks page (§7.4)
// ---------------------------------------------------------------------------

const taskInput = z.object({
  client_id: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: z.string().trim().max(2000).nullable().optional(),
  due_date: z.iso.date('Pick a due date'),
  due_time: z.iso.time().nullable().optional(),
  staff_id: z.string().uuid().nullable().optional(),
})

export async function createTask(input: z.input<typeof taskInput>) {
  const { supabase, userId } = await requireUser()
  const data = taskInput.parse(input)

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      ...data,
      description: data.description || null,
      due_time: data.due_time || null,
      staff_id: data.staff_id ?? null,
      author_id: userId,
    })
    .select()
    .single()
  if (error) fail(error)
  revalidate(data.client_id)
  return task as Task
}

const taskUpdateInput = taskInput.partial().omit({ client_id: true })

export async function updateTask(taskId: string, clientId: string, input: z.input<typeof taskUpdateInput>) {
  const { supabase } = await requireUser()
  const updates = taskUpdateInput.parse(input)

  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
  if (error) fail(error)
  revalidate(clientId)
}

/** Quick-complete / reopen. Status itself is derived — only completed_at moves. */
export async function setTaskCompleted(taskId: string, clientId: string, completed: boolean) {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('tasks')
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq('id', taskId)
  if (error) fail(error)
  revalidate(clientId)
}

export async function deleteTask(taskId: string, clientId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) fail(error)
  revalidate(clientId)
}
