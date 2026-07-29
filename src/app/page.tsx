// Overview Dashboard — server-rendered, reads clients_with_health under RLS,
// computes all portfolio-level metrics in one pass.

import Link from 'next/link'
import { getDashboardData } from '@/lib/data/queries'
import { NavRail, PageHeader } from '@/components/shared'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export const metadata = { title: 'Overview — Aurora CRM' }

export default async function DashboardPage() {
  let data
  try {
    data = await getDashboardData()
  } catch {
    data = null
  }

  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <PageHeader
          title="Overview"
          subtitle={data ? `$${data.total_debt_eliminated.toLocaleString()} eliminated across ${data.total_cases} cases · ${data.properties_under_mgmt} properties under management` : ''}
          breadcrumb={[{ label: 'Overview' }]}
        />
        <div className="container mx-auto px-4 py-6">
          {data === null ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-muted-foreground">Couldn&apos;t load dashboard data. Make sure you&apos;re signed in and try again.</p>
              <Link href="/clients" className="mt-4 inline-block text-primary hover:underline">Go to Clients</Link>
            </div>
          ) : (
            <DashboardView data={data} />
          )}
        </div>
      </main>
    </div>
  )
}
