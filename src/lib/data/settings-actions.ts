'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { createServerClient } from '@/lib/supabase/server'
import { requireUser } from './mutations'
import { findDuplicates } from './domain'
import type { PipelineStage } from './types'

const VALID_STAGES: PipelineStage[] = ['consultation', 'exit_plan', 'in_progress', 'resolved']
const VALID_USAGE_FREQUENCY = ['annual', 'biennial', 'odd_year', 'even_year'] as const
const VALID_USAGE_TYPE = ['fixed_week', 'floating_week', 'points_based'] as const

const SSN_REGEX = /^\d{4}$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const US_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/

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

/** Strip currency formatting: $45,000.00 → 45000.00. Returns NaN on garbage. */
function parseMoney(v: string): number | null {
  const stripped = v.replace(/[$,\s]/g, '')
  if (!stripped) return null
  const n = Number(stripped)
  return Number.isFinite(n) ? n : null
}

/** Accept YYYY-MM-DD or M/D/YYYY (Excel default). Returns null for blank/garbage. */
function parseDate(v: string): string | null {
  const s = v.trim()
  if (!s) return null
  if (ISO_DATE_REGEX.test(s)) return s
  const m = US_DATE_REGEX.exec(s)
  if (!m) return null
  const [, mo, d, y] = m
  let year = Number(y)
  if (y.length === 2) {
    // 2-digit year pivot: more than 10 years in the future → 19xx (DOBs), else 20xx.
    // ponytail: 10-year lookahead; revisit in 2036.
    const pivot = (new Date().getFullYear() % 100) + 10
    year = year > pivot ? 1900 + year : 2000 + year
  }
  const mm = String(Number(mo)).padStart(2, '0')
  const dd = String(Number(d)).padStart(2, '0')
  const iso = `${year}-${mm}-${dd}`
  // sanity check the result is a valid date
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  return iso
}

/** Accept true/false/yes/no/1/0. Returns null on anything else. */
function parseBool(v: string): boolean | null {
  const s = v.trim().toLowerCase()
  if (!s) return null
  if (['true', 'yes', '1', 'y'].includes(s)) return true
  if (['false', 'no', '0', 'n'].includes(s)) return false
  return null
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
    // Client intake
    'co_client_name','dob','ssn_last4','address','phone2','retainer_fee',
    // Property intake
    'usage_frequency','usage_type','fees_current','fees_behind_amount','maintenance_fees_billed',
  ]

  // One row per property. Clients with no properties get one row with empty property columns.
  const rows: unknown[][] = []
  for (const c of (clients ?? []) as Record<string, unknown>[]) {
    const clientId = String(c.id ?? '')
    const props = propsByClient.get(clientId) ?? []
    if (props.length === 0) {
      rows.push(clientRow(c, {}))
    } else {
      for (const p of props) rows.push(clientRow(c, p))
    }
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csvContent

  function clientRow(c: Record<string, unknown>, p: Record<string, unknown>) {
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
      // Client intake fields
      String(c.co_client_name ?? ''),
      String(c.dob ?? ''),
      String(c.ssn_last4 ?? ''),
      String(c.address ?? ''),
      String(c.phone2 ?? ''),
      String(c.retainer_fee ?? ''),
      // Property intake fields
      String(p.usage_frequency ?? ''),
      String(p.usage_type ?? ''),
      String(p.fees_current ?? ''),
      String(p.fees_behind_amount ?? ''),
      String(p.maintenance_fees_billed ?? ''),
    ]
  }
}

export async function importClientsFromCsv(csvText: string) {
  const { supabase, userId } = await requireUser()

  // Strip UTF-8 BOM (Excel prepends one and it glues to the first header → required-column check fails)
  const cleaned = csvText.replace(/^\uFEFF/, '')

  const parsed = Papa.parse(cleaned, {
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

  // ------------------------------------------------------------------
  // Pass 1 — normalize, validate, and group rows by client key.
  // Every error is collected; if any exist, we abort the whole import
  // before inserting a single row (no partial imports).
  // ------------------------------------------------------------------

  const normErr = (n: number) => `Row ${n + 1}`
  const errors: string[] = []
  const warnings: string[] = []

  type Group = {
    client: {
      name: string
      phone: string
      email: string
      state: string
      zip: string
      stage: PipelineStage
      case_opened_at: string | null
      tags: string[]
      co_client_name: string | null
      dob: string | null
      ssn_last4: string | null
      address: string | null
      phone2: string | null
      retainer_fee: number | null
    }
    properties: Array<Record<string, unknown>>
    label: string // for error messages
  }

  const groups = new Map<string, Group>()

  rows.forEach((row, i) => {
    const where = normErr(i)
    const name = row.name?.trim() ?? ''
    const phone = row.phone?.trim() ?? ''
    const email = row.email?.trim() ?? ''
    const state = row.state?.trim().toUpperCase() ?? ''
    const zip = row.zip?.trim() ?? ''

    if (!name) errors.push(`${where}: missing "name"`)
    if (!phone) errors.push(`${where} (${name || 'unknown'}): missing "phone"`)
    if (!email) errors.push(`${where} (${name || 'unknown'}): missing "email"`)
    if (!state) errors.push(`${where} (${name || 'unknown'}): missing "state"`)
    if (!zip) errors.push(`${where} (${name || 'unknown'}): missing "zip"`)

    // ssn_last4 — exactly 4 digits if provided
    const ssnRaw = row.ssn_last4?.trim() ?? ''
    const ssn = ssnRaw ? (SSN_REGEX.test(ssnRaw) ? ssnRaw : null) : null
    if (ssnRaw && !ssn) errors.push(`${where} (${name}): ssn_last4 must be exactly 4 digits (got "${ssnRaw}")`)

    // dates — accept YYYY-MM-DD or M/D/YYYY
    const dob = parseDate(row.dob ?? '')
    if (row.dob?.trim() && !dob) errors.push(`${where} (${name}): dob must be YYYY-MM-DD or M/D/YYYY`)
    const caseOpened = parseDate(row.case_opened_at ?? '')
    if (row.case_opened_at?.trim() && !caseOpened) errors.push(`${where} (${name}): case_opened_at must be YYYY-MM-DD or M/D/YYYY`)
    const feeDue = parseDate(row.fee_due_date ?? '')
    if (row.fee_due_date?.trim() && !feeDue) errors.push(`${where} (${name}): fee_due_date must be YYYY-MM-DD or M/D/YYYY`)

    // money fields
    const retainer = parseMoney(row.retainer_fee ?? '')
    if (row.retainer_fee?.trim() && retainer === null) errors.push(`${where} (${name}): retainer_fee must be a number`)
    const purchase = parseMoney(row.purchase_price ?? '')
    if (row.purchase_price?.trim() && purchase === null) errors.push(`${where} (${name}): purchase_price must be a number`)
    const loan = parseMoney(row.loan_balance ?? '')
    if (row.loan_balance?.trim() && loan === null) errors.push(`${where} (${name}): loan_balance must be a number`)
    const maint = parseMoney(row.maintenance_fee ?? '')
    if (row.maintenance_fee?.trim() && maint === null) errors.push(`${where} (${name}): maintenance_fee must be a number`)
    const behind = parseMoney(row.fees_behind_amount ?? '')
    if (row.fees_behind_amount?.trim() && behind === null) errors.push(`${where} (${name}): fees_behind_amount must be a number`)
    const maintBilled = parseMoney(row.maintenance_fees_billed ?? '')
    if (row.maintenance_fees_billed?.trim() && maintBilled === null) errors.push(`${where} (${name}): maintenance_fees_billed must be a number`)

    // fees_current — accept true/false/yes/no/1/0; default to true when missing
    const feesCurrentRaw = row.fees_current?.trim() ?? ''
    let feesCurrent: boolean = true
    if (feesCurrentRaw) {
      const b = parseBool(feesCurrentRaw)
      if (b === null) {
        warnings.push(`${where} (${name}): fees_current "${feesCurrentRaw}" is not recognized — defaulted to true`)
      } else {
        feesCurrent = b
      }
    }

    // stage — invalid → consultation
    const stageRaw = row.stage?.trim().toLowerCase() ?? ''
    const stage: PipelineStage = VALID_STAGES.includes(stageRaw as PipelineStage)
      ? (stageRaw as PipelineStage)
      : 'consultation'
    if (stageRaw && !VALID_STAGES.includes(stageRaw as PipelineStage)) {
      warnings.push(`${where} (${name}): stage "${stageRaw}" is not recognized — defaulted to "consultation"`)
    }

    // enums — invalid → null + warning
    const ufRaw = row.usage_frequency?.trim().toLowerCase() ?? ''
    let usageFrequency: string | null = null
    if (ufRaw) {
      if ((VALID_USAGE_FREQUENCY as readonly string[]).includes(ufRaw)) usageFrequency = ufRaw
      else warnings.push(`${where} (${name}): usage_frequency "${ufRaw}" is not one of annual/biennial/odd_year/even_year — set to blank`)
    }
    const utRaw = row.usage_type?.trim().toLowerCase() ?? ''
    let usageType: string | null = null
    if (utRaw) {
      if ((VALID_USAGE_TYPE as readonly string[]).includes(utRaw)) usageType = utRaw
      else warnings.push(`${where} (${name}): usage_type "${utRaw}" is not one of fixed_week/floating_week/points_based — set to blank`)
    }

    const tags = row.tags
      ? row.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
      : []

    const clientRow = {
      name, phone, email, state, zip, stage,
      case_opened_at: caseOpened,
      tags,
      co_client_name: row.co_client_name?.trim() || null,
      dob,
      ssn_last4: ssn,
      address: row.address?.trim() || null,
      phone2: row.phone2?.trim() || null,
      retainer_fee: retainer,
    }

    // property (only if resort_name OR resort_location present)
    const hasProperty = row.resort_name?.trim() || row.resort_location?.trim()
    const propertyRow = hasProperty
      ? {
          resort_name: row.resort_name?.trim() || null,
          resort_location: row.resort_location?.trim() || null,
          unit_number: row.unit_number?.trim() || null,
          purchase_price: purchase,
          loan_balance: loan,
          maintenance_fee: maint,
          fee_due_date: feeDue,
          document_reference: row.document_reference?.trim() || null,
          usage_frequency: usageFrequency,
          usage_type: usageType,
          fees_current: feesCurrent,
          fees_behind_amount: behind,
          maintenance_fees_billed: maintBilled,
        }
      : null

    // Client identity key (lowercase + phone digits only) — groups all properties for the same person
    const phoneDigits = phone.replace(/\D/g, '')
    const key = `${name.toLowerCase()}|${phoneDigits}`

    const existingGroup = groups.get(key)
    if (existingGroup) {
      if (propertyRow) existingGroup.properties.push(propertyRow)
    } else {
      groups.set(key, { client: clientRow, properties: propertyRow ? [propertyRow] : [], label: name })
    }
  })

  if (errors.length > 0) {
    const shown = errors.slice(0, 10).join('\n')
    const more = errors.length > 10 ? `\n…and ${errors.length - 10} more` : ''
    throw new Error(`Fix ${errors.length} row error${errors.length === 1 ? '' : 's'} before importing:\n${shown}${more}`)
  }

  // ------------------------------------------------------------------
  // Pass 2 — insert clients, then all their properties.
  // Duplicates (already in DB) skip the whole group.
  // ------------------------------------------------------------------

  let imported = 0
  let propertiesImported = 0
  let duplicates = 0

  for (const group of groups.values()) {
    const matches = findDuplicates(existingClients, {
      name: group.client.name,
      email: group.client.email,
      phone: group.client.phone,
    })
    if (matches.length > 0) {
      duplicates += 1
      continue
    }

    // Omit case_opened_at when blank so the DB default fires (default now()).
    const insertPayload: Record<string, unknown> = {
      ...group.client,
      author_id: userId,
    }
    if (!insertPayload.case_opened_at) delete insertPayload.case_opened_at

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(insertPayload)
      .select()
      .single()

    if (clientError) throw clientError

    for (const prop of group.properties) {
      const { error: propError } = await supabase
        .from('properties')
        .insert({ ...prop, client_id: client.id })
      if (propError) throw propError
      propertiesImported += 1
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
  return { imported, properties: propertiesImported, duplicates, warnings }
}
