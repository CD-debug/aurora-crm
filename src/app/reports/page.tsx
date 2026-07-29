import { getReportData } from '@/lib/data/reports'
import { NavRail, PageHeader } from '@/components/shared'
import { CountUp } from '@/components/shared/motion'

export const metadata = { title: 'Reports — Aurora CRM' }

export default async function ReportsPage() {
  const data = await getReportData()

  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16">
        <PageHeader
          title="Reports"
          subtitle={`${data.totalClients} clients · ${data.totalTasks} tasks · ${data.overdueTasks} overdue`}
          breadcrumb={[{ label: 'Dashboard', href: '/' }, { label: 'Reports' }]}
        />
        <div className="container mx-auto px-4 py-6 space-y-6">

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Clients" value={data.totalClients} />
        <StatCard label="Total Tasks" value={data.totalTasks} />
        <StatCard label="Overdue Tasks" value={data.overdueTasks} warn={data.overdueTasks > 0} />
        <StatCard label="Completed Tasks" value={data.completedTasks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Clients by Stage">
          {data.byStage.map(s => (
            <BarRow key={s.stage} label={s.stage} value={s.count} max={Math.max(data.totalClients, 1)} />
          ))}
        </Section>

        <Section title="Clients by Health">
          {data.byHealth.map(h => (
            <BarRow key={h.label} label={h.label} value={h.count} max={Math.max(data.totalClients, 1)} color={h.color} />
          ))}
        </Section>

        <Section title="Top 10 States">
          {data.byState?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No data yet.</p>
          ) : (
            data.byState.map(s => (
              <BarRow key={s.state} label={s.state} value={s.count} max={Math.max(data.totalClients, 1)} />
            ))
          )}
        </Section>

        <Section title="Properties">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Active</span>
              <span className="font-mono tabular-nums font-medium">{data.activeProperties}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid Off</span>
              <span className="font-mono tabular-nums font-medium">{data.paidOffProperties}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total purchase price</span>
              <span className="font-mono tabular-nums font-medium">${data.totalPurchasePrice.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total loan balance</span>
              <span className="font-mono tabular-nums font-medium">${data.totalLoanBalance.toLocaleString()}</span></div>
          </div>
        </Section>

        <Section title="Team Activity">
          {data.teamActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No team members yet. Add names in <span className="font-medium">Settings → Team Members</span> to see per-member activity here.
            </p>
          ) : (
            <div className="space-y-3">
              {data.teamActivity.map((m) => {
                const total = m.tasksTotal + m.notes
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground font-mono tabular-nums">
                        {m.notes} note{m.notes !== 1 ? 's' : ''} · {m.tasksCompleted}/{m.tasksTotal} task{m.tasksTotal !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                        {m.tasksTotal > 0 && (
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(m.tasksTotal / total) * 100}%` }}
                            title={`${m.tasksTotal} task${m.tasksTotal !== 1 ? 's' : ''} (${m.tasksCompleted} done)`}
                          />
                        )}
                        {m.notes > 0 && (
                          <div
                            className="h-full bg-chart-2"
                            style={{ width: `${(m.notes / total) * 100}%` }}
                            title={`${m.notes} note${m.notes !== 1 ? 's' : ''}`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {(data.unassignedActivity.notes > 0 || data.unassignedActivity.tasksTotal > 0) && (
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground italic">Unassigned</span>
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {data.unassignedActivity.notes} note{data.unassignedActivity.notes !== 1 ? 's' : ''} · {data.unassignedActivity.tasksCompleted}/{data.unassignedActivity.tasksTotal} task{data.unassignedActivity.tasksTotal !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
        </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border bg-card border-l-4 ${warn ? 'border-l-red-500' : 'border-l-primary'}`}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-mono tabular-nums font-bold mt-1">
        <CountUp value={value} />
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function BarRow({ label, value, max, color = 'var(--primary)' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
