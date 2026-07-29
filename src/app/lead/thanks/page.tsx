import Link from 'next/link'
import { AuroraMark } from '@/components/shared'

export const metadata = { title: 'Thank You — Aurora CRM' }

export default function ThanksPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center mb-6">
          <AuroraMark size="md" />
        </div>
        <h1 className="text-2xl font-heading font-semibold mb-2">Thank You</h1>
        <p className="text-muted-foreground mb-6">
          We received your request. A consultant will reach out within 24 hours.
        </p>
        <Link href="/login" className="text-primary hover:underline text-sm">
          Consultant login
        </Link>
      </div>
    </div>
  )
}
