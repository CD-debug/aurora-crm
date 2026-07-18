'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { queryKeys } from '@/lib/data/query-keys'
import { redirect } from 'next/navigation'

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/clients')
  revalidatePath('/tasks')
}

export async function createClient(formData: FormData) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const clientData = {
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    state: formData.get('state') as string,
    zip: formData.get('zip') as string,
    author_id: user.id,
    stage: 'consultation',
    stage_entered_at: new Date().toISOString(),
    case_opened_at: new Date().toISOString(),
    health_status: 'on_track',
    tags: [],
  }

  const { data, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single()

  if (error) throw error
  revalidateAll()
  redirect(`/clients/${data.id}`)
}

export async function updateClientStage(clientId: string, newStage: string) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('stage')
    .eq('id', clientId)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('clients')
    .update({
      stage: newStage,
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) throw error
  revalidateAll()
}

export async function createProperty(clientId: string, formData: FormData) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const propertyData = {
    client_id: clientId,
    resort_name: formData.get('resort_name') as string,
    resort_location: formData.get('resort_location') as string,
    unit_number: formData.get('unit_number') as string || null,
    purchase_price: formData.get('purchase_price') ? Number(formData.get('purchase_price')) : null,
    loan_balance: formData.get('loan_balance') ? Number(formData.get('loan_balance')) : null,
    maintenance_fee: formData.get('maintenance_fee') ? Number(formData.get('maintenance_fee')) : null,
    fee_due_date: formData.get('fee_due_date') as string || null,
    status: 'active',
    document_reference: formData.get('document_reference') as string || null,
    author_id: user.id,
  }

  const { error } = await supabase.from('properties').insert(propertyData)
  if (error) throw error
  revalidateAll()
}

export async function updateProperty(propertyId: string, updates: Record<string, unknown>) {
  const supabase = createServerSupabaseClient()
  
  const { error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', propertyId)

  if (error) throw error
  revalidateAll()
}

export async function createNote(clientId: string, formData: FormData) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const noteData = {
    client_id: clientId,
    author_id: user.id,
    channel: formData.get('channel') as string,
    content: formData.get('content') as string,
  }

  const { error } = await supabase.from('notes').insert(noteData)
  if (error) throw error
  revalidateAll()
}

export async function createTask(clientId: string, formData: FormData) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const taskData = {
    client_id: clientId,
    author_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    due_date: formData.get('due_date') as string,
    due_time: formData.get('due_time') as string || null,
    status: 'pending',
  }

  const { error } = await supabase.from('tasks').insert(taskData)
  if (error) throw error
  revalidateAll()
}

export async function completeTask(taskId: string) {
  const supabase = createServerSupabaseClient()
  
  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) throw error
  revalidateAll()
}

export async function updateTask(taskId: string, updates: Record<string, unknown>) {
  const supabase = createServerSupabaseClient()
  
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)

  if (error) throw error
  revalidateAll()
}