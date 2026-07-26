import Link from 'next/link'
import { LeadForm } from './lead-form'

export const metadata = { title: 'Get Help — Aurora CRM' }

export default function LeadPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D9C8D]/10 to-[#4338CA]/10 p-6">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-heading font-semibold mb-2">Free Timeshare Exit Consultation</h1>
        <p className="text-muted-foreground mb-6">Fill out the form and our team will contact you within 24 hours.</p>
        <LeadForm />
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Already a client? <Link href="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
