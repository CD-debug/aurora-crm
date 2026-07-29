// One-off parser verification for the CSV import rewrite.
// ponytail: smallest runnable check that fails if the parsers break.
const SSN_REGEX = /^\d{4}$/
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const US_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/

function parseMoney(v) {
  const stripped = v.replace(/[$,\s]/g, '')
  if (!stripped) return null
  const n = Number(stripped)
  return Number.isFinite(n) ? n : null
}
function parseDate(v) {
  const s = v.trim()
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
  const iso = `${year}-${String(Number(mo)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`
  const dt = new Date(iso)
  return Number.isNaN(dt.getTime()) ? null : iso
}
function parseBool(v) {
  const s = v.trim().toLowerCase()
  if (!s) return null
  if (['true', 'yes', '1', 'y'].includes(s)) return true
  if (['false', 'no', '0', 'n'].includes(s)) return false
  return null
}

const assert = (cond, label) => { if (!cond) { console.error('FAIL:', label); process.exit(1) } }

assert(parseMoney('$45,000.00') === 45000, 'money $45,000.00')
assert(parseMoney('32000') === 32000, 'money 32000')
assert(parseMoney('') === null, 'money blank')
assert(parseMoney('abc') === null, 'money abc')
assert(parseDate('1962-04-18') === '1962-04-18', 'ISO date')
assert(parseDate('4/18/1962') === '1962-04-18', 'US date')
assert(parseDate('4/18/62') === '1962-04-18', 'US 2-digit year (DOB → 19xx)')
assert(parseDate('6/1/30') === '2030-06-01', 'US 2-digit year (near future → 20xx)')
assert(parseDate('13/45/2026') === null, 'invalid US date')
assert(parseDate('garbage') === null, 'bad date')
assert(parseBool('FALSE') === false, 'bool FALSE')
assert(parseBool('yes') === true, 'bool yes')
assert(parseBool('maybe') === null, 'bool maybe')
assert(SSN_REGEX.test('4521') === true, 'ssn ok')
assert(SSN_REGEX.test('452') === false, 'ssn short')

console.log('ALL PARSER CHECKS PASSED')
