import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkjytbnalmzmfxjkrhmn.supabase.co'
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE

const c = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
const { data } = await c.from('properties').select('id, client_id, resort_name, usage_frequency, usage_type, fees_current, fees_behind_amount, maintenance_fees_billed').not('usage_frequency', 'is', null).limit(5)
console.log(JSON.stringify(data, null, 2))
