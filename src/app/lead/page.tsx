import Link from 'next/link'
import { LeadForm } from './lead-form'

export const metadata = { title: 'Get Help — Aurora CRM' }

function AuroraOrb() {
  return (
    <div className="w-14 h-14 rounded-2xl bg-aurora-arc text-white font-heading font-bold text-3xl flex items-center justify-center shadow-lg">
      A
    </div>
  )
}

export default function LeadPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D9C8D]/12 via-background to-[#4338CA]/12 p-6">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <AuroraOrb />
          <h1 className="mt-4 text-2xl font-heading font-semibold tracking-tight">Aurora</h1>
          <p className="text-sm text-muted-foreground mt-1">Free timeshare exit consultation.</p>
        </div>
        <h2 className="text-lg font-medium mb-2">Tell us about your situation.</h2>
        <p className="text-sm text-muted-foreground mb-6">
          No obligation. We review every inquiry and tell you honestly whether we can help.
        </p>
        <LeadForm />
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Already a client? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
