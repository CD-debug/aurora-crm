// Verify what the public-facing routes actually return.
const fetch = global.fetch

const routes = ['/', '/login', '/lead', '/lead/thanks']
for (const r of routes) {
  const res = await fetch(`https://aurora-crm-psi.vercel.app${r}`, { redirect: 'manual' })
  const text = await res.text()
  const keyWords = {
    'Sign in': text.includes('Sign in'),
    'Aurora': text.includes('Aurora'),
    'CRM': text.includes('CRM'),
    'timeshare': text.toLowerCase().includes('timeshare'),
    'Error': text.includes('error'),
  }
  console.log(`${r} -> ${res.status} (${text.length}b)`, JSON.stringify(keyWords))
}
