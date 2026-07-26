// Seed demo data into the Aurora CRM Supabase instance.
// Run with: node scripts/seed.mjs
// Uses the SUPABASE_SERVICE_ROLE_KEY env var to bypass RLS for seeding.
//
// IMPORTANT: The new sb_secret_ format rejects calls with a browser-like
// User-Agent. Node's global fetch sends no User-Agent by default, which
// is exactly what we want.
//
// Required env vars (set in a local .env file or the shell):
//   NEXT_PUBLIC_SUPABASE_URL            — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY           — your service-role key (do NOT commit)
//   SEED_USER_ID                        — the demo user UUID to attach records to
//
// Example:
//   NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
//   SEED_USER_ID=1b1799d2-0b2b-4a65-aeae-1910378c24ed \
//   node scripts/seed.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Minimal .env loader so the script doesn't depend on a specific dotenv package.
function loadEnv() {
  const here = dirname(fileURLToPath(import.meta.url))
  const envPath = resolve(here, '..', '.env.local')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoUserId = process.env.SEED_USER_ID

if (!url || !serviceKey || !demoUserId) {
  console.error('Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID')
  process.exit(1)
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TODAY = new Date()
const daysAgo = (n) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
const daysFromNow = (n) => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// 1. Wipe existing demo data for this user (idempotent reseed)
// ---------------------------------------------------------------------------
async function wipe() {
  console.log('Wiping existing clients (cascades to properties, notes, tasks)…')
  const { error } = await db.from('clients').delete().eq('author_id', demoUserId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// 2. Clients + stage distribution
// ---------------------------------------------------------------------------
const CLIENTS = [
  // Resolved / big wins — for "Debt Eliminated" headline
  {
    name: 'Linda Harding', phone: '8135550102', email: 'linda.harding@example.com',
    state: 'FL', zip: '33602', stage: 'resolved',
    stage_entered_at: daysAgo(45), case_opened_at: daysAgo(395),
    resolved_at: daysAgo(45), tags: ['VIP'],
    properties: [
      { resort_name: 'Marriott Grand Vista', resort_location: 'Orlando, FL',
        unit_number: '412-B', purchase_price: 42000, loan_balance: 0,
        paid_off: true, value_eliminated: 42000, status: 'paid_off',
        document_reference: 'https://docs.example.com/harding-contract.pdf' },
    ],
  },
  {
    name: 'Marcus Devlin', phone: '7025550148', email: 'marcus.devlin@example.com',
    state: 'NV', zip: '89101', stage: 'resolved',
    stage_entered_at: daysAgo(20), case_opened_at: daysAgo(290),
    resolved_at: daysAgo(20), tags: ['Referral'],
    properties: [
      { resort_name: 'Westgate Las Vegas Resort', resort_location: 'Las Vegas, NV',
        purchase_price: 29500, loan_balance: 0,
        paid_off: true, value_eliminated: 29500, status: 'paid_off' },
    ],
  },
  // In progress — featured case for "big win pending"
  {
    name: 'Patricia Kelley', phone: '3055550123', email: 'patricia.kelley@example.com',
    state: 'FL', zip: '33139', stage: 'in_progress',
    stage_entered_at: daysAgo(58), case_opened_at: daysAgo(220), tags: ['VIP', 'Mortgage'],
    properties: [
      { resort_name: 'Wyndham Grand Clearwater', resort_location: 'Clearwater, FL',
        unit_number: '1808', purchase_price: 85500, loan_balance: 62000,
        maintenance_fee: 1450, fee_due_date: daysFromNow(22),
        document_reference: 'https://docs.example.com/kelley-deed.pdf' },
    ],
  },
  {
    name: 'Derek Morgan', phone: '6235550166', email: 'derek.morgan@example.com',
    state: 'AZ', zip: '85003', stage: 'in_progress',
    stage_entered_at: daysAgo(112), case_opened_at: daysAgo(330), tags: [],
    properties: [
      { resort_name: 'Diamond Resorts Scottsdale', resort_location: 'Scottsdale, AZ',
        purchase_price: 35000, loan_balance: 28000, maintenance_fee: 980,
        fee_due_date: daysFromNow(14) },
    ],
  },
  {
    name: 'Sandy Bachman', phone: '4075550188', email: 'sandy.bachman@example.com',
    state: 'FL', zip: '32801', stage: 'in_progress',
    stage_entered_at: daysAgo(75), case_opened_at: daysAgo(190), tags: ['Mortgage'],
    properties: [
      { resort_name: 'Hyatt Regency Coconut Point', resort_location: 'Bonita Springs, FL',
        purchase_price: 51500, loan_balance: 38000, maintenance_fee: 1250,
        fee_due_date: daysFromNow(7) },
    ],
  },
  // Exit Plan stage
  {
    name: 'James Whitlow', phone: '9195550177', email: 'james.whitlow@example.com',
    state: 'NC', zip: '27601', stage: 'exit_plan',
    stage_entered_at: daysAgo(12), case_opened_at: daysAgo(60), tags: [],
    properties: [
      { resort_name: 'Bluegreen Resorts Carolina Pkwy', resort_location: 'Pinehurst, NC',
        purchase_price: 22000, loan_balance: 17500, maintenance_fee: 720,
        fee_due_date: daysFromNow(45) },
    ],
  },
  {
    name: 'Roberta Vega', phone: '8135550145', email: 'roberta.vega@example.com',
    state: 'FL', zip: '33611', stage: 'exit_plan',
    stage_entered_at: daysAgo(28), case_opened_at: daysAgo(95), tags: ['Referral'],
    properties: [
      { resort_name: 'Marriott Harbour Point', resort_location: 'Tampa, FL',
        purchase_price: 33000, loan_balance: 24500, maintenance_fee: 980,
        fee_due_date: daysFromNow(5) },
    ],
  },
  // Consultation (newest leads)
  {
    name: 'Christine Park', phone: '5035550199', email: 'christine.park@example.com',
    state: 'OR', zip: '97201', stage: 'consultation',
    stage_entered_at: daysAgo(2), case_opened_at: daysAgo(2), tags: ['New'],
    properties: [],
  },
  {
    name: 'Antonio Reyes', phone: '5125550114', email: 'a.reyes@example.com',
    state: 'TX', zip: '78701', stage: 'consultation',
    stage_entered_at: daysAgo(5), case_opened_at: daysAgo(5), tags: [],
    properties: [],
  },
  {
    name: 'Margaret Sutter', phone: '7025550122', email: 'margaret.s@example.com',
    state: 'NV', zip: '89102', stage: 'consultation',
    stage_entered_at: daysAgo(8), case_opened_at: daysAgo(8), tags: ['Mortgage'],
    properties: [
      { resort_name: 'Hilton Grand Vacations Strip', resort_location: 'Las Vegas, NV',
        purchase_price: 18900, loan_balance: 14200, maintenance_fee: 850,
        fee_due_date: daysFromNow(60) },
    ],
  },
  // At Risk / Stalled candidates (long time in stage, no recent contact)
  {
    name: 'Robert Sanchez', phone: '9545550119', email: 'r.sanchez@example.com',
    state: 'FL', zip: '33301', stage: 'in_progress',
    stage_entered_at: daysAgo(95), case_opened_at: daysAgo(280), tags: [],
    properties: [
      { resort_name: 'Wyndham Palm Aire', resort_location: 'Pompano Beach, FL',
        purchase_price: 27500, loan_balance: 21000, maintenance_fee: 720,
        fee_due_date: daysFromNow(35) },
    ],
  },
  {
    name: 'Evelyn Marsh', phone: '7575550188', email: 'evelyn.m@example.com',
    state: 'VA', zip: '23451', stage: 'in_progress',
    stage_entered_at: daysAgo(48), case_opened_at: daysAgo(155), tags: [],
    properties: [
      { resort_name: 'Holiday Inn Club Vacations', resort_location: 'Williamsburg, VA',
        purchase_price: 9500, loan_balance: 7200, maintenance_fee: 410,
        fee_due_date: daysFromNow(19) },
    ],
  },
]

async function insertClients() {
  console.log(`Inserting ${CLIENTS.length} clients…`)
  const clientRows = CLIENTS.map((c) => ({
    name: c.name, phone: c.phone, email: c.email, state: c.state, zip: c.zip,
    stage: c.stage, stage_entered_at: c.stage_entered_at,
    case_opened_at: c.case_opened_at, resolved_at: c.resolved_at ?? null,
    tags: c.tags, author_id: demoUserId,
  }))
  const { data, error } = await db.from('clients').insert(clientRows).select('id, name')
  if (error) throw error
  return data // [{id, name}]
}

async function insertProperties(insertedClients) {
  console.log('Inserting properties…')
  const byName = new Map(insertedClients.map((c) => [c.name, c.id]))
  const rows = []
  for (const c of CLIENTS) {
    if (!c.properties?.length) continue
    for (const p of c.properties) {
      rows.push({
        client_id: byName.get(c.name),
        resort_name: p.resort_name, resort_location: p.resort_location,
        unit_number: p.unit_number ?? null,
        purchase_price: p.purchase_price ?? null,
        loan_balance: p.paid_off ? 0 : (p.loan_balance ?? null),
        maintenance_fee: p.maintenance_fee ?? null,
        fee_due_date: p.fee_due_date ?? null,
        status: p.paid_off ? 'paid_off' : 'active',
        paid_off_at: p.paid_off ? daysAgo(30) : null,
        document_reference: p.document_reference ?? null,
        value_eliminated: p.paid_off ? (p.value_eliminated ?? p.loan_balance ?? null) : null,
      })
    }
  }
  const { error } = await db.from('properties').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// 3. Notes — varied channels, freshness driven by stage
// ---------------------------------------------------------------------------
const NOTES_TEMPLATES = [
  { channel: 'phone', content: 'Called to discuss exit timeline. Spoke with owner themselves; left detailed next-steps voicemail since they were unavailable.' },
  { channel: 'email', content: 'Reviewed contract amendment terms and circled two clauses we want to flag in the next status call.' },
  { channel: 'text', content: 'Quick confirmation their maintenance fee had paid this cycle — works on our timeline.' },
  { channel: 'phone', content: 'Intake walk-through scheduled. Sent the prep packet ahead so we can hit the ground running.' },
  { channel: 'email', content: 'Quarterly update sent. Highlighted stage advancement and what to expect in next 14 days.' },
]

async function insertNotes(insertedClients) {
  console.log('Inserting notes…')
  const byName = new Map(insertedClients.map((c) => [c.name, c.id]))
  const rows = []
  let counter = 0
  for (const c of CLIENTS) {
    if (c.stage === 'consultation' && !c.properties?.length) {
      // Fresh leads: 1 initial contact
      rows.push({
        client_id: byName.get(c.name),
        author_id: demoUserId,
        channel: 'phone',
        content: 'Initial intake call — confirmed ownership question, set follow-up to collect contract.',
        created_at: c.case_opened_at,
      })
      counter++
      continue
    }
    // Everyone else: 2-5 notes spread over the case lifetime
    const noteCount = c.stage === 'resolved' ? 5 : 3
    for (let i = 0; i < noteCount; i++) {
      const t = NOTES_TEMPLATES[i % NOTES_TEMPLATES.length]
      const age = counter++ * 6 // stagger
      rows.push({
        client_id: byName.get(c.name),
        author_id: demoUserId,
        channel: t.channel,
        content: t.content,
        created_at: daysAgo(age),
      })
    }
  }
  const { error } = await db.from('notes').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// 4. Tasks — mix of overdue, today, upcoming, completed
// ---------------------------------------------------------------------------
async function insertTasks(insertedClients) {
  console.log('Inserting tasks…')
  const byName = new Map(insertedClients.map((c) => [c.name, c.id]))
  const rows = []

  const taskTemplates = [
    // overdue
    { title: 'Send reminder about maintenance fee submission', due_offset_days: -3, status: 'open' },
    // today
    { title: 'Review contract amendment redlines', due_offset_days: 0, status: 'open' },
    // upcoming
    { title: 'Schedule closing call with seller', due_offset_days: 6, status: 'open' },
    { title: 'Follow up: signed closing documents', due_offset_days: 12, status: 'open' },
    // completed
    { title: 'Initial intake call', due_offset_days: -25, status: 'completed' },
  ]

  for (const c of CLIENTS) {
    if (c.stage === 'resolved') continue
    // Active cases get an overdue + upcoming + completed
    // Consultations just get one upcoming + one completed
    const set = c.stage === 'consultation'
      ? [taskTemplates[2], taskTemplates[4]]
      : [taskTemplates[0], taskTemplates[1], taskTemplates[3], taskTemplates[4]]

    for (const t of set) {
      const due = daysFromNow(t.due_offset_days)
      rows.push({
        client_id: byName.get(c.name),
        author_id: demoUserId,
        title: t.title,
        due_date: due,
        completed_at: t.status === 'completed' ? daysAgo(Math.abs(t.due_offset_days) - 1) : null,
      })
    }
  }
  const { error } = await db.from('tasks').insert(rows)
  if (error) throw error
}

// ---------------------------------------------------------------------------
async function main() {
  try {
    await wipe()
    const clients = await insertClients()
    await insertProperties(clients)
    await insertNotes(clients)
    await insertTasks(clients)
    console.log(`\nSeeded: ${clients.length} clients (plus properties, notes, tasks).`)
  } catch (err) {
    console.error('Seed failed:', err.message ?? err)
    process.exit(1)
  }
}

main()
