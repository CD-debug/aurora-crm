// Overview Dashboard — server-rendered, reads clients_with_health under RLS,
// computes all portfolio-level metrics in one pass.

import Link from 'next/link'
import { getDashboardData } from '@/lib/data/queries'
import { NavRail, Breadcrumb } from '@/components/shared'
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
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
          <div className="container mx-auto px-4 py-3">
            <Breadcrumb items={[{ label: 'Overview' }]} className="mb-1" />
            <h1 className="text-2xl font-heading font-semibold">Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Portfolio-level metrics and pipeline health.</p>
          </div>
        </header>
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
