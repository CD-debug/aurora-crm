const fetch = global.fetch
const projectRef = 'zkjytbnalmzmfxjkrhmn'
const anonKey = 'sb_publishable_soM8WmODzzQaMPKoHoEKgg_hYINDBkA'

const r1 = await fetch(
  `https://${projectRef}.supabase.co/auth/v1/token?grant_type=password`,
  {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@auroracrm.com', password: 'Aurora2026!' }),
  },
)
const login = await r1.json()
const cookieValue = Buffer.from(
  JSON.stringify({
    access_token: login.access_token,
    refresh_token: login.refresh_token,
    expires_at: login.expires_at,
    token_type: 'bearer',
    expires_in: login.expires_in,
    user: login.user,
  }),
).toString('base64')

const r2 = await fetch('https://aurora-crm-psi.vercel.app/', {
  headers: { Cookie: `sb-${projectRef}-auth-token=${cookieValue}` },
  redirect: 'manual',
})
console.log('status:', r2.status, 'headers:', Object.fromEntries(r2.headers))
const html = await r2.text()
console.log('---SAMPLE---')
console.log(html.slice(0, 800))
console.log('---END---')
console.log('contains "Sign in":', html.includes('Sign in'))
console.log('contains "Welcome to Aurora":', html.includes('Welcome to Aurora'))
console.log('contains error:', html.includes('error'))
