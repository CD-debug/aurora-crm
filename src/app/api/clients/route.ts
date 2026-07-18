import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search')
  const health = searchParams.get('health')
  const state = searchParams.get('state')
  const stage = searchParams.get('stage')
  const sort = searchParams.get('sort') || 'created_at'
  const direction = searchParams.get('direction') || 'desc'

  let query = supabase
    .from('clients')
    .select('*')
    .eq('author_id', user.id)
    .order(sort, { ascending: direction === 'asc' })

  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  if (health) query = query.eq('health_status', health)
  if (state) query = query.eq('state', state)
  if (stage) query = query.eq('stage', stage)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...body, author_id: user.id, stage: 'consultation', stage_entered_at: new Date().toISOString(), case_opened_at: new Date().toISOString(), health_status: 'on_track', tags: [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data })
}