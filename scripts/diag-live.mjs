import { createClient } from '@supabase/supabase-js'

const projectRef = 'zkjytbnalmzmfxjkrhmn'
const url = `https://${projectRef}.supabase.co`
const anonKey = 'sb_publishable_soM8WmODzzQaMPKoHoEKgg_hYINDBkA'

async function main() {
  const { createServerClient } = await import('@supabase/ssr')
  const cookieMap = new Map()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return Array.from(cookieMap, ([n, v]) => ({ name: n, value: v })) },
      setAll(cookies) { cookies.forEach(({ name, value, options }) => cookieMap.set(name, value)) },
    },
  })
  const { data: login, error } = await supabase.auth.signInWithPassword({
    email: 'demo@auroracrm.com',
    password: 'Aurora2026!',
  })
  if (error) { console.error('login err:', error.message); process.exit(1) }
  console.log('login OK, user:', login.user.email)

  const cookieHeader = Array.from(cookieMap.entries())
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join('; ')

  const fs = await import('node:fs')

  async function probe(path, label, saveAs) {
    const r = await fetch('https://aurora-crm-psi.vercel.app' + path, {
      headers: { Cookie: cookieHeader },
    })
    const text = await r.text()
    console.log(`\n=== ${label} (${path}) status=${r.status} len=${text.length} ===`)
    if (text.includes('404: This page could not be found')) {
      console.log('*** 404 NOT FOUND ***')
    }
    if (text.includes('Server Components') || text.includes('Application error') || text.includes('digest:')) {
      console.log('*** ERROR PAGE ***')
      const m = text.indexOf('An error occurred')
      if (m >= 0) console.log(text.slice(m, m + 600))
      const d = text.indexOf('digest:')
      if (d >= 0) console.log(text.slice(Math.max(0, d - 100), d + 300))
    }
    if (saveAs) {
      fs.writeFileSync(saveAs, text)
    }
  }

  await probe('/', 'Dashboard', 'scripts/last-dashboard.html')
  await probe('/clients', 'Clients list', 'scripts/last-clients.html')
  await probe('/tasks', 'Tasks', 'scripts/last-tasks.html')
  await probe('/reports', 'Reports', 'scripts/last-reports.html')
  await probe('/settings', 'Settings', 'scripts/last-settings.html')

  const { data: clients } = await supabase
    .from('clients_with_health')
    .select('id, name')
    .limit(3)
  if (clients) {
    for (const c of clients) {
      await probe(`/clients/${c.id}`, `Client 360 (${c.name})`, `scripts/last-c360-${c.id.slice(0, 8)}.html`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
