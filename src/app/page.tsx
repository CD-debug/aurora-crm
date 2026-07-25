// Overview Dashboard (PRD §9) — server-rendered, reads clients_with_health
// under RLS, computes all portfolio-level metrics in one pass.

import Link from 'next/link'
import { getDashboardData } from '@/lib/data/queries'
import { NavRail, ClientHealthBadge } from '@/components/shared'
import { MetricCard, StageBreakdown } from '@/components/dashboard/metric-cards'
import { STAGE_LABELS } from '@/lib/data/domain'
import {
  DollarSign, Users, AlertTriangle, CheckCircle, Clock, Target,
  TrendingUp, Home,
} from 'lucide-react'

export const metadata = { title: 'Overview — Aurora CRM' }

export default async function DashboardPage() {
  let data
  try {
    data = await getDashboardData()
  } catch (e) {
    data = null
  }

  const stageData = [
    { stage: 'consultation', label: STAGE_LABELS.consultation, color: '#0D9C8D' },
    { stage: 'exit_plan', label: STAGE_LABELS.exit_plan, color: '#4338CA' },
    { stage: 'in_progress', label: STAGE_LABELS.in_progress, color: '#D97706' },
    { stage: 'resolved', label: STAGE_LABELS.resolved, color: '#16A34A' },
  ].map((s) => ({ ...s, count: data?.stage_counts[s.stage as keyof typeof data.stage_counts] ?? 0 }))

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-semibold tracking-tight">Overview Dashboard</h1>
            <p className="text-muted-foreground mt-1">Portfolio-level metrics and pipeline health</p>
          </div>

          {data === null ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-muted-foreground">Couldn&apos;t load dashboard data. Make sure you&apos;re signed in and try again.</p>
              <Link href="/clients" className="mt-4 inline-block text-primary hover:underline">Go to Clients</Link>
            </div>
          ) : (
            <>
              {/* Headline metric cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Total Cases"
                  value={data.total_cases}
                  icon={<Users className="w-5 h-5" />}
                  href="/clients"
                  color="primary"
                />
                <MetricCard
                  title="Active"
                  value={data.active_cases}
                  icon={<Target className="w-5 h-5" />}
                  href="/clients?stage=active"
                  color="info"
                />
                <MetricCard
                  title="At Risk"
                  value={data.at_risk_cases}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  href="/clients?health=at_risk"
                  color="danger"
                />
                <MetricCard
                  title="Stalled"
                  value={data.stalled_cases}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  href="/clients?health=stalled"
                  color="warning"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                  title="Resolved"
                  value={data.resolved_cases}
                  icon={<CheckCircle className="w-5 h-5" />}
                  href="/clients?stage=resolved"
                  color="success"
                />
                <MetricCard
                  title="Debt Eliminated"
                  value={`$${Number(data.total_debt_eliminated).toLocaleString()}`}
                  icon={<DollarSign className="w-5 h-5" />}
                  color="success"
                  description="Across paid-off properties"
                />
                <MetricCard
                  title="Properties Under Mgmt"
                  value={data.properties_under_mgmt}
                  icon={<Home className="w-5 h-5" />}
                  color="info"
                />
                <MetricCard
                  title="Resolution Rate"
                  value={`${data.resolution_rate.toFixed(1)}%`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="success"
                />
              </div>

              {/* Avg time to resolution */}
              <div className="mb-8 p-4 rounded-lg border bg-card flex items-center gap-4">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg. Time to Resolution</p>
                  <p className="text-xl font-bold font-mono tabular-nums">
                    {data.avg_days_to_resolution != null
                      ? `${Math.round(data.avg_days_to_resolution)} days`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Stage breakdown + attention list */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <StageBreakdown stages={stageData} total={data.total_cases} />
                </div>
                <div className="space-y-4">
                  {data.attention.length > 0 && (
                    <div className="p-4 rounded-lg border bg-card">
                      <h3 className="text-sm font-semibold mb-3">Needs Attention</h3>
                      <div className="space-y-2">
                        {data.attention.map((c) => (
                          <Link
                            key={c.id}
                            href={`/clients/${c.id}`}
                            className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 transition-colors group"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {c.overdue_task_count > 0
                                  ? `${c.overdue_task_count} overdue task${c.overdue_task_count !== 1 ? 's' : ''}`
                                  : `${c.health_status === 'stalled' ? 'Stalled' : 'At risk'}`}
                              </p>
                            </div>
                            <ClientHealthBadge status={c.health_status} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}