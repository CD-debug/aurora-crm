'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

async function getUserId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function createClientRecord(data: {
  name: string
  phone: string
  email: string
  state: string
  zip: string
}) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      ...data,
      stage: 'consultation',
      stage_entered_at: new Date().toISOString(),
      case_opened_at: new Date().toISOString(),
      health_status: 'on_track',
      author_id: userId,
      tags: [],
    })
    .select()
    .single()
  
  if (error) throw error
  
  revalidatePath('/clients')
  revalidatePath('/')
  
  return client
}

export async function updateClientStage(clientId: string, stage: string) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { error } = await supabase
    .from('clients')
    .update({
      stage: stage as any,
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('author_id', userId)
  
  if (error) throw error
  
  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/')
  
  return { success: true }
}

export async function createProperty(data: {
  client_id: string
  resort_name: string
  resort_location: string
  unit_number?: string
  purchase_price?: number
  loan_balance?: number
  maintenance_fee?: number
  fee_due_date?: string
  document_reference?: string
}) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      ...data,
      status: 'active',
      author_id: userId,
    })
    .select()
    .single()
  
  if (error) throw error
  
  revalidatePath(`/clients/${data.client_id}`)
  revalidatePath('/')
  
  return property
}

export async function updateProperty(propertyId: string, data: Partial<{
  status: 'active' | 'paid_off' | 'foreclosed' | 'relinquished'
  paid_off_at: string | null
  loan_balance: number
  value_eliminated: number
}>) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { error } = await supabase
    .from('properties')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId)
    .eq('author_id', userId)
  
  if (error) throw error
  
  revalidatePath('/clients/*')
  revalidatePath('/')
  
  return { success: true }
}

export async function createNote(data: {
  client_id: string
  channel: 'call' | 'email' | 'sms' | 'meeting' | 'internal'
  content: string
}) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { data: note, error } = await supabase
    .from('notes')
    .insert({
      ...data,
      author_id: userId,
    })
    .select()
    .single()
  
  if (error) throw error
  
  revalidatePath(`/clients/${data.client_id}`)
  revalidatePath('/clients')
  
  return note
}

export async function createTask(data: {
  client_id: string
  title: string
  description?: string
  due_date: string
  due_time?: string
}) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      ...data,
      status: 'pending',
      author_id: userId,
    })
    .select()
    .single()
  
  if (error) throw error
  
  revalidatePath(`/clients/${data.client_id}`)
  revalidatePath('/tasks')
  revalidatePath('/')
  
  return task
}

export async function updateTask(taskId: string, data: Partial<{
  status: 'pending' | 'completed' | 'overdue'
  completed_at: string | null
  title: string
  description: string
  due_date: string
  due_time: string
}>) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const updates = {
    ...data,
    updated_at: new Date().toISOString(),
  }
  
  if (data.status === 'completed' && !data.completed_at) {
    updates.completed_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('author_id', userId)
  
  if (error) throw error
  
  revalidatePath('/clients/*')
  revalidatePath('/tasks')
  revalidatePath('/')
  
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const supabase = await createServerClient()
  const userId = await getUserId()
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('author_id', userId)
  
  if (error) throw error
  
  revalidatePath('/clients/*')
  revalidatePath('/tasks')
  revalidatePath('/')
  
  return { success: true }
}