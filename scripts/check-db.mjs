import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkjytbnalmzmfxjkrhmn.supabase.co'
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

const c = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
)

async function main() {
  // Check if new columns exist on clients table
  const { data: clients, error: ce } = await c
    .from('clients')
    .select('id, dob, co_client_name, ssn_last4, address, phone2, retainer_fee')
    .limit(1)
  if (ce) {
    console.log('clients query error:', ce.message, ce.details, ce.hint)
  } else {
    console.log('clients row:', JSON.stringify(clients[0]))
  }

  // Check if new columns exist on properties table
  const { data: props, error: pe } = await c
    .from('properties')
    .select('id, usage_frequency, usage_type, fees_current, fees_behind_amount, maintenance_fees_billed')
    .limit(1)
  if (pe) {
    console.log('properties query error:', pe.message, pe.details, pe.hint)
  } else {
    console.log('properties row:', JSON.stringify(props[0]))
  }

  // Check clients_with_health view
  const { data: view, error: ve } = await c
    .from('clients_with_health')
    .select('id, name, dob, co_client_name, ssn_last4')
    .limit(1)
  if (ve) {
    console.log('clients_with_health view error:', ve.message)
  } else {
    console.log('view row:', JSON.stringify(view[0]))
  }

  // Also check what columns the view actually has
  const { data: viewTest, error: vte } = await c
    .from('clients_with_health')
    .select('*')
    .limit(1)
  if (vte) {
    console.log('view select * error:', vte.message)
  } else {
    console.log('view select * keys:', Object.keys(viewTest[0]).sort().join(', '))
  }
}

main().catch(console.error)
