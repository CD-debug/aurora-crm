'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { createServerClient } from '@/lib/supabase/server'
import { requireUser } from './mutations'
import { findDuplicates } from './domain'
import type { PipelineStage } from './types'

const VALID_STAGES: PipelineStage[] = ['consultation', 'exit_plan', 'in_progress', 'resolved']

// Default values used when the settings table hasn't been created yet
// (graceful degradation — the page still renders, just with no persisted state).
const SETTINGS_DEFAULTS: Record<string, Record<string, unknown>> = {
  general: { company_name: 'Aurora CRM' },
  csv_import: { last_import_at: null, total_imported: 0, duplicates_skipped: 0 },
}

function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  return (
    code === 'PGRST205' ||
    code === '42883' || // function not found
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('function') && msg.includes('does not exist')
  )
}

export async function getSettings(key: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_settings', { p_key: key })
  if (error) {
    if (isMissingTable(error)) return SETTINGS_DEFAULTS[key] ?? {}
    throw error
  }
  return (data as Record<string, unknown> | null) ?? SETTINGS_DEFAULTS[key] ?? {}
}

export async function updateSettings(key: string, value: Record<string, unknown>) {
  const supabase = await createServerClient()
  const { error } = await supabase.rpc('update_settings', { p_key: key, p_value: value })
  if (error) {
    if (isMissingTable(error)) return // graceful no-op until table is created
    throw error
  }
  revalidatePath('/settings')
}

export async function exportClientsCsv() {
  const supabase = await createServerClient()
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (clientsError) throw clientsError

  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('*')

  if (propsError) throw propsError

  const propsByClient = new Map<string, Record<string, unknown>[]>()
  ;(properties ?? []).forEach((p: Record<string, unknown>) => {
    const clientId = String(p.client_id ?? '')
    const arr = propsByClient.get(clientId) ?? []
    arr.push(p)
    propsByClient.set(clientId, arr)
  })

  const headers = [
    'name','phone','email','state','zip',
    'stage','case_opened_at','tags',
    'resort_name','resort_location','unit_number',
    'purchase_price','loan_balance','maintenance_fee',
    'fee_due_date','document_reference',
  ]

  const rows = (clients ?? []).map((c: Record<string, unknown>) => {
    const clientId = String(c.id ?? '')
    const props = propsByClient.get(clientId) ?? []
    const p = (props[0] ?? {}) as Record<string, unknown>
    return [
      String(c.name ?? ''),
      String(c.phone ?? ''),
      String(c.email ?? ''),
      String(c.state ?? ''),
      String(c.zip ?? ''),
      String(c.stage ?? ''),
      String(c.case_opened_at ?? ''),
      Array.isArray(c.tags) ? c.tags.join(', ') : '',
      String(p.resort_name ?? ''),
      String(p.resort_location ?? ''),
      String(p.unit_number ?? ''),
      String(p.purchase_price ?? ''),
      String(p.loan_balance ?? ''),
      String(p.maintenance_fee ?? ''),
      String(p.fee_due_date ?? ''),
      String(p.document_reference ?? ''),
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((r: unknown[]) => r.map((v: unknown) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csvContent
}

export async function importClientsFromCsv(csvText: string) {
  const { supabase, userId } = await requireUser()

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`)
  }

  const rows = parsed.data as Record<string, string>[]

  if (rows.length === 0) {
    throw new Error('CSV has no data rows')
  }

  const headers = parsed.meta.fields?.map((f: string) => f.toLowerCase()) ?? []

  const requiredCols = ['name', 'phone', 'email', 'state', 'zip']
  const missing = requiredCols.filter((c) => !headers.includes(c))
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`)
  }

  const { data: existing } = await supabase
    .from('clients')
    .select('id, name, email, phone')
  const existingClients = existing ?? []

  let imported = 0
  let duplicates = 0

  for (const row of rows) {
    const name = row.name?.trim() ?? ''
    const phone = row.phone?.trim() ?? ''
    const email = row.email?.trim() ?? ''
    const state = row.state?.trim() ?? ''
    const zip = row.zip?.trim() ?? ''

    if (!name || !phone || !email || !state || !zip) {
      throw new Error(`Missing required values in row for "${name || 'unknown'}"`)
    }

    const matches = findDuplicates(existingClients, { name, email, phone })
    if (matches.length > 0) {
      duplicates += 1
      continue
    }

    const rawStage = row.stage?.trim().toLowerCase() ?? ''
    const stage = VALID_STAGES.includes(rawStage as PipelineStage) ? (rawStage as PipelineStage) : 'consultation'

    const tags = row.tags
      ? row.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        name,
        phone,
        email,
        state,
        zip,
        stage,
        case_opened_at: row.case_opened_at || null,
        tags,
        author_id: userId,
      })
      .select()
      .single()

    if (clientError) throw clientError

    const hasProperty = row.resort_name?.trim() || row.resort_location?.trim()
    if (hasProperty) {
      const { error: propError } = await supabase.from('properties').insert({
        client_id: client.id,
        resort_name: row.resort_name || null,
        resort_location: row.resort_location || null,
        unit_number: row.unit_number || null,
        purchase_price: row.purchase_price ? Number(row.purchase_price) : null,
        loan_balance: row.loan_balance ? Number(row.loan_balance) : null,
        maintenance_fee: row.maintenance_fee ? Number(row.maintenance_fee) : null,
        fee_due_date: row.fee_due_date || null,
        document_reference: row.document_reference || null,
      })
      if (propError) throw propError
    }

    imported += 1
  }

  const current = await getSettings('csv_import')
  await updateSettings('csv_import', {
    ...current,
    last_import_at: new Date().toISOString(),
    total_imported: ((current.total_imported as number) ?? 0) + imported,
    duplicates_skipped: duplicates,
  })

  revalidatePath('/clients')
  revalidatePath('/settings')
  return { imported, duplicates }
}
