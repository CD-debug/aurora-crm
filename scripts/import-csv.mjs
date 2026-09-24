import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'
import { readFileSync } from 'fs'

// Replicating the exact logic from settings-actions.ts but using service_role

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkjytbnalmzmfxjkrhmn.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE
const AUTHOR_ID = 'a6508b84-5506-4a58-ad37-107dd18926f6' // craig.office.mail@gmail.com

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const VALID_STAGES = ['consultation', 'exit_plan', 'in_progress', 'resolved']
const SSN_REGEX = /^\d{4}$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const US_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/

function parseMoney(v) {
  const stripped = String(v ?? '').replace(/[$,\s]/g, '')
  if (!stripped) return null
  const n = Number(stripped)
  return Number.isFinite(n) ? n : null
}

function parseDate(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (ISO_DATE_REGEX.test(s)) return s
  const m = US_DATE_REGEX.exec(s)
  if (!m) return null
  const [, mo, d, y] = m
  let year = Number(y)
  if (y.length === 2) {
    const pivot = (new Date().getFullYear() % 100) + 10
    year = year > pivot ? 1900 + year : 2000 + year
  }
  const mm = String(Number(mo)).padStart(2, '0')
  const dd = String(Number(d)).padStart(2, '0')
  const iso = `${year}-${mm}-${dd}`
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  return iso
}

function parseBool(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  if (['true', 'yes', '1', 'y'].includes(s)) return true
  if (['false', 'no', '0', 'n'].includes(s)) return false
  return null
}

async function main() {
  const csvText = readFileSync('C:\\Users\\craig\\Downloads\\clients_crm_import.csv', 'utf-8')
  const cleaned = csvText.replace(/^\uFEFF/, '')
  const parsed = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) throw new Error(`Parse error: ${parsed.errors[0].message}`)

  const rows = parsed.data
  console.log(`Parsed ${rows.length} rows`)

  const headers = parsed.meta.fields?.map((f) => f.toLowerCase()) ?? []
  const requiredCols = ['name', 'phone', 'email', 'state', 'zip']
  const missing = requiredCols.filter((c) => !headers.includes(c))
  if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`)

  // Fetch existing clients for dedup
  const { data: existingData } = await supabase.from('clients').select('id, name, email, phone')
  const existingClients = existingData ?? []
  console.log(`Existing clients: ${existingClients.length}`)

  const errors = []
  const warnings = []
  const groups = new Map()

  rows.forEach((row, i) => {
    const name = (row.name ?? '').trim()
    const phone = (row.phone ?? '').trim()
    const email = (row.email ?? '').trim()
    const state = (row.state ?? '').trim().toUpperCase()
    const zip = (row.zip ?? '').trim()

    if (!name) errors.push(`Row ${i+1}: missing "name"`)
    if (!phone) errors.push(`Row ${i+1} (${name || 'unknown'}): missing "phone"`)
    if (!email) errors.push(`Row ${i+1} (${name || 'unknown'}): missing "email"`)
    if (!state) errors.push(`Row ${i+1} (${name || 'unknown'}): missing "state"`)
    if (!zip) errors.push(`Row ${i+1} (${name || 'unknown'}): missing "zip"`)

    if (errors.length > 10) return // early exit for error collection

    const ssnRaw = (row.ssn_last4 ?? '').trim()
    const ssn = ssnRaw ? (SSN_REGEX.test(ssnRaw) ? ssnRaw : null) : null
    if (ssnRaw && !ssn) errors.push(`Row ${i+1} (${name}): ssn_last4 must be 4 digits`)

    const dob = parseDate(row.dob ?? '')
    if (row.dob?.trim() && !dob) errors.push(`Row ${i+1} (${name}): invalid dob`)
    const caseOpened = parseDate(row.case_opened_at ?? '')
    const feeDue = parseDate(row.fee_due_date ?? '')
    if (row.fee_due_date?.trim() && !feeDue) errors.push(`Row ${i+1} (${name}): invalid fee_due_date`)

    const retainer = parseMoney(row.retainer_fee ?? '')
    const purchase = parseMoney(row.purchase_price ?? '')
    const loan = parseMoney(row.loan_balance ?? '')
    const maint = parseMoney(row.maintenance_fee ?? '')
    const behind = parseMoney(row.fees_behind_amount ?? '')
    const maintBilled = parseMoney(row.maintenance_fees_billed ?? '')

    let feesCurrent = true
    const feesRaw = (row.fees_current ?? '').trim()
    if (feesRaw) {
      const b = parseBool(feesRaw)
      if (b === null) warnings.push(`Row ${i+1} (${name}): fees_current "${feesRaw}" unrecognized, defaulted true`)
      else feesCurrent = b
    }

    const stageRaw = (row.stage ?? '').trim().toLowerCase()
    const stage = VALID_STAGES.includes(stageRaw) ? stageRaw : 'consultation'
    if (stageRaw && !VALID_STAGES.includes(stageRaw)) warnings.push(`Row ${i+1} (${name}): stage "${stageRaw}" unrecognized, defaulted consultation`)

    const ufRaw = (row.usage_frequency ?? '').trim().toLowerCase()
    const validUF = ['annual', 'biennial', 'odd_year', 'even_year']
    let usageFrequency = null
    if (ufRaw) {
      if (validUF.includes(ufRaw)) usageFrequency = ufRaw
      else warnings.push(`Row ${i+1} (${name}): usage_frequency "${ufRaw}" unrecognized`)
    }

    const utRaw = (row.usage_type ?? '').trim().toLowerCase()
    const validUT = ['fixed_week', 'floating_week', 'points_based']
    let usageType = null
    if (utRaw) {
      if (validUT.includes(utRaw)) usageType = utRaw
      else warnings.push(`Row ${i+1} (${name}): usage_type "${utRaw}" unrecognized`)
    }

    const tags = row.tags ? row.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : []

    const clientRow = {
      name, phone, email, state, zip, stage,
      case_opened_at: caseOpened,
      tags,
      co_client_name: (row.co_client_name ?? '').trim() || null,
      dob,
      ssn_last4: ssn,
      address: (row.address ?? '').trim() || null,
      phone2: (row.phone2 ?? '').trim() || null,
      retainer_fee: retainer,
    }

    const hasProperty = (row.resort_name ?? '').trim() || (row.resort_location ?? '').trim()
    const propertyRow = hasProperty
      ? {
          resort_name: (row.resort_name ?? '').trim() || null,
          resort_location: (row.resort_location ?? '').trim() || null,
          unit_number: (row.unit_number ?? '').trim() || null,
          purchase_price: purchase,
          loan_balance: loan,
          maintenance_fee: maint,
          fee_due_date: feeDue,
          document_reference: (row.document_reference ?? '').trim() || null,
          usage_frequency: usageFrequency,
          usage_type: usageType,
          fees_current: feesCurrent,
          fees_behind_amount: behind,
          maintenance_fees_billed: maintBilled,
        }
      : null

    const phoneDigits = phone.replace(/\D/g, '')
    const key = `${name.toLowerCase()}|${phoneDigits}`
    const existingGroup = groups.get(key)
    if (existingGroup) {
      if (propertyRow) existingGroup.properties.push(propertyRow)
    } else {
      groups.set(key, {
        client: clientRow,
        properties: propertyRow ? [propertyRow] : [],
        label: name,
      })
    }
  })

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation errors (aborting):`)
    errors.slice(0, 10).forEach((e) => console.error(`  - ${e}`))
    if (errors.length > 10) console.error(`  ...and ${errors.length - 10} more`)
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warnings:`)
    warnings.slice(0, 5).forEach((w) => console.log(`  - ${w}`))
    if (warnings.length > 5) console.log(`  ...and ${warnings.length - 5} more`)
  }

  console.log(`\n${groups.size} client groups to import:`)
  for (const group of groups.values()) {
    console.log(`  ${group.client.name} — ${group.properties.length} propert${group.properties.length === 1 ? 'y' : 'ies'}`)
  }

  // Duplicate check
  let importCount = 0
  let propCount = 0
  let dupCount = 0

  for (const group of groups.values()) {
    const c = group.client
    const matches = existingClients.filter((e) => {
      const nameMatch = e.name?.toLowerCase() === c.name.toLowerCase()
      const phoneMatch = e.phone?.replace(/\D/g, '') === c.phone.replace(/\D/g, '')
      const emailMatch = e.email?.toLowerCase() === c.email.toLowerCase()
      return nameMatch || phoneMatch || emailMatch
    })
    if (matches.length > 0) {
      dupCount++
      continue
    }

    const insertPayload = { ...group.client, author_id: AUTHOR_ID }
    if (!insertPayload.case_opened_at) delete insertPayload.case_opened_at

    const { data: cl, error: ce } = await supabase.from('clients').insert(insertPayload).select().single()
    if (ce) { console.error(`Insert failed for ${c.name}:`, ce); process.exit(1) }

    for (const prop of group.properties) {
      const { error: pe } = await supabase.from('properties').insert({ ...prop, client_id: cl.id })
      if (pe) { console.error(`Property insert failed for ${c.name}:`, pe); process.exit(1) }
      propCount++
    }
    importCount++
    if (importCount % 50 === 0) console.log(`  Progress: ${importCount}/${groups.size} clients inserted`)
  }

  console.log(`\nDone!`)
  console.log(`  Clients imported: ${importCount}`)
  console.log(`  Properties imported: ${propCount}`)
  console.log(`  Duplicates skipped: ${dupCount}`)
  if (warnings.length > 0) console.log(`  Warnings: ${warnings.length}`)
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
