import { getReportData } from '@/lib/data/reports'
import { NavRail, Breadcrumb } from '@/components/shared'

export const metadata = { title: 'Reports — Aurora CRM' }

export default async function ReportsPage() {
  const data = await getReportData()

  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
          <div className="container mx-auto px-4 py-3">
            <Breadcrumb items={[{ label: 'Dashboard', href: '/' }, { label: 'Reports' }]} className="mb-1" />
            <h1 className="text-2xl font-heading font-semibold">Reports</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Portfolio overview across your entire caseload.</p>
          </div>
        </header>
        <div className="container mx-auto px-4 py-6 space-y-6">

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Clients" value={data.totalClients} />
        <StatCard label="Total Tasks" value={data.totalTasks} />
        <StatCard label="Overdue Tasks" value={data.overdueTasks} />
        <StatCard label="Completed Tasks" value={data.completedTasks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Clients by Stage">
          {data.byStage.map(s => (
            <BarRow key={s.stage} label={s.stage} value={s.count} max={data.totalClients} />
          ))}
        </Section>

        <Section title="Clients by Health">
          {data.byHealth.map(h => (
            <BarRow key={h.label} label={h.label} value={h.count} max={data.totalClients} color={h.color} />
          ))}
        </Section>

        <Section title="Top 10 States">
          {data.byState.map(s => (
            <BarRow key={s.state} label={s.state} value={s.count} max={data.totalClients} />
          ))}
        </Section>

        <Section title="Properties">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Active</span><span className="font-medium">{data.activeProperties}</span></div>
            <div className="flex justify-between text-sm"><span>Paid Off</span><span className="font-medium">{data.paidOffProperties}</span></div>
            <div className="flex justify-between text-sm"><span>Total Purchase Price</span><span className="font-medium">${data.totalPurchasePrice.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span>Total Loan Balance</span><span className="font-medium">${data.totalLoanBalance.toLocaleString()}</span></div>
          </div>
        </Section>
        </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-heading font-semibold mt-1">{value.toLocaleString()}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function BarRow({ label, value, max, color = '#0D9C8D' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
