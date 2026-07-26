'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/data/mutations'
import { findDuplicates } from '@/lib/data/domain'

export async function createLeadFromForm(data: {
  name: string
  phone: string
  email: string
  state: string
  zip: string
  source?: string
}) {
  const { supabase, userId } = await requireUser()

  const { data: existing } = await supabase
    .from('clients')
    .select('id, name, email, phone')

  const matches = findDuplicates(existing ?? [], {
    name: data.name,
    email: data.email,
    phone: data.phone,
  })

  if (matches.length > 0) {
    return matches[0].id
  }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: data.name,
      phone: data.phone,
      email: data.email,
      state: data.state.toUpperCase(),
      zip: data.zip,
      stage: 'consultation',
      tags: data.source ? [`lead:${data.source}`] : ['lead:website'],
      author_id: userId,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/clients')
  return client.id
}
