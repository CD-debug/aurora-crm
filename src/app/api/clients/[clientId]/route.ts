import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await params

  const [{ data: client }, { data: properties }, { data: notes }, { data: tasks }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).eq('author_id', user.id).single(),
    supabase.from('properties').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('client_id', clientId).order('due_date', { ascending: true }),
  ])

  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    client,
    properties: properties || [],
    notes: notes || [],
    tasks: tasks || [],
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('clients')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('author_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data })
}