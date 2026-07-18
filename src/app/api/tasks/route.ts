import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('clientId')
  const status = searchParams.get('status')
  const dueDate = searchParams.get('dueDate')

  let query = supabase
    .from('tasks')
    .select('*, clients(name)')
    .eq('clients.author_id', user.id)
    .order('due_date', { ascending: true })

  if (clientId) query = query.eq('client_id', clientId)
  if (status) query = query.eq('status', status)
  if (dueDate) query = query.eq('due_date', dueDate)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...body, author_id: user.id, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}