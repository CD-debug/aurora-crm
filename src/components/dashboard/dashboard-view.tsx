'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClientHealthBadge, ThemeToggle } from '@/components/shared'
import { Stagger, FadeUp, CountUp } from '@/components/shared/motion'
import type { DashboardData } from '@/lib/data/types'
import { STAGE_LABELS } from '@/lib/data/domain'
import { DollarSign, Users, AlertTriangle, AlertCircle, CheckCircle, Target, TrendingUp, Clock } from 'lucide-react'

function MetricTileSmall({ icon, title, value, numericValue, href, color }: {
  icon: React.ReactNode
  title: string
  value: string | number
  numericValue?: number
  href?: string
  color: string
}) {
  const inner = (
    <div className="p-4 rounded-lg bg-muted/30 border-0 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2.5">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-0.5">
            {numericValue !== undefined ? (
              <CountUp
                value={numericValue}
                prefix={typeof value === 'string' ? (value.startsWith('$') ? '$' : '') : ''}
                suffix={typeof value === 'string' && value.endsWith('%') ? '%' : ''}
              />
            ) : value}
          </p>
        </div>
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}

function AttentionRow({ client, index }: {
  client: DashboardData['attention'][number]
  index: number
}) {
  const isOverdue = client.overdue_task_count > 0
  const isStalled = client.health_status === 'stalled'

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 + index * 0.05 }}
    >
      <Link
        href={`/clients/${client.id}`}
        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 transition-colors group"
      >
        <div className="min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-foreground transition-colors">{client.name}</p>
          <p className="text-xs text-muted-foreground">
            {isOverdue
              ? `${client.overdue_task_count} overdue task${client.overdue_task_count !== 1 ? 's' : ''}`
              : isStalled ? 'Stalled' : 'At risk'}
          </p>
        </div>
        <ClientHealthBadge status={client.health_status} />
      </Link>
    </motion.div>
  )
}

export function DashboardView({ data }: { data: DashboardData }) {
  const stageData = [
    { stage: 'consultation', label: STAGE_LABELS.consultation, color: 'var(--chart-1)' },
    { stage: 'exit_plan', label: STAGE_LABELS.exit_plan, color: 'var(--chart-2)' },
    { stage: 'in_progress', label: STAGE_LABELS.in_progress, color: 'var(--chart-4)' },
    { stage: 'resolved', label: STAGE_LABELS.resolved, color: 'var(--chart-5)' },
  ].map((s) => ({ ...s, count: data.stage_counts[s.stage as keyof typeof data.stage_counts] ?? 0 }))

  const noData = data.total_cases === 0

  return (
    <Stagger className="space-y-6" delay={0.1}>
      {/* Dashboard header row — toggle in upper-right (per Decision #2) */}
      <FadeUp>
        <div className="flex items-center justify-end -mb-2">
          <ThemeToggle />
        </div>
      </FadeUp>

      {/* Hero: Debt Eliminated */}
      <FadeUp>
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
          <div className="p-6 rounded-xl border bg-card">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Debt Eliminated</p>
            <p className="text-5xl md:text-6xl font-heading font-normal tracking-[-0.02em] text-foreground">
              ${data.total_debt_eliminated.toLocaleString()}
            </p>
            {data.this_month_debt_eliminated > 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-sm font-mono tabular-nums text-emerald-700 bg-[var(--surface-success)] px-2 py-0.5 rounded">
                  + ${data.this_month_debt_eliminated.toLocaleString()} this month
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                No properties paid off in the last 30 days yet.
              </p>
            )}
          </div>
          <div className="hidden lg:flex flex-col justify-center items-end p-6 rounded-xl border bg-card">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Avg. time to resolution</p>
              <p className="text-2xl font-heading font-semibold mt-1 tabular-nums">
                {data.avg_days_to_resolution != null ? `${Math.round(data.avg_days_to_resolution)} days` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">across {data.resolved_cases} resolved case{data.resolved_cases !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Supporting metrics */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTileSmall icon={<Users className="w-4 h-4" />} title="Total Cases" value={data.total_cases} numericValue={data.total_cases} href="/clients" color="primary" />
          <MetricTileSmall icon={<TrendingUp className="w-4 h-4" />} title="Resolution Rate" value={`${data.resolution_rate.toFixed(1)}%`} numericValue={Math.round(data.resolution_rate)} color="success" />
          <MetricTileSmall icon={<Target className="w-4 h-4" />} title="Active" value={data.active_cases} numericValue={data.active_cases} href="/clients?stage=active" color="info" />
          <MetricTileSmall icon={<Clock className="w-4 h-4" />} title="Avg. Time" value={data.avg_days_to_resolution != null ? `${Math.round(data.avg_days_to_resolution)} days` : '—'} color="info" />
        </div>
      </FadeUp>

      {/* At Risk / Stalled row */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTileSmall icon={<AlertTriangle className="w-4 h-4" />} title="At Risk" value={data.at_risk_cases} numericValue={data.at_risk_cases} href="/clients?health=at_risk" color="danger" />
          <MetricTileSmall icon={<AlertCircle className="w-4 h-4" />} title="Stalled" value={data.stalled_cases} numericValue={data.stalled_cases} href="/clients?health=stalled" color="warning" />
          <MetricTileSmall icon={<CheckCircle className="w-4 h-4" />} title="Resolved" value={data.resolved_cases} numericValue={data.resolved_cases} href="/clients?stage=resolved" color="success" />
          <MetricTileSmall icon={<DollarSign className="w-4 h-4" />} title="Properties" value={data.properties_under_mgmt} numericValue={data.properties_under_mgmt} color="info" />
        </div>
      </FadeUp>

      {/* Pipeline + Attention */}
      <FadeUp>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="lg:col-span-2 p-6 rounded-xl border bg-card"
          >
            <h3 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">Pipeline Distribution</h3>
            {noData ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No cases yet — add your first client to see the pipeline.</p>
                <Link href="/clients" className="text-primary hover:underline text-sm font-medium">Go to Clients →</Link>
              </div>
            ) : (
              <>
                <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                  {stageData.map((s) => {
                    const pct = data.total_cases > 0 ? (s.count / data.total_cases) * 100 : 0
                    return pct > 0 ? (
                      <motion.div
                        key={s.stage}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                        className="h-full origin-left"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                      />
                    ) : null
                  })}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
                  {stageData.map((s) => (
                    <Link
                      key={s.stage}
                      href={`/clients?stage=${s.stage}`}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-sm font-medium group-hover:text-foreground transition-colors">{s.label}</span>
                      <span className="ml-auto text-sm font-mono tabular-nums text-muted-foreground">
                        {data.total_cases > 0 ? `${Math.round((s.count / data.total_cases) * 100)}%` : '0%'}
                      </span>
                      <span className="text-sm font-mono tabular-nums w-8 text-right">{s.count}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
            className="p-6 rounded-xl border bg-card"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Needs Attention</h3>
            {data.attention.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">All cases on track</p>
            ) : (
              <div className="space-y-1">
                {data.attention.map((client, i) => (
                  <AttentionRow key={client.id} client={client} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </FadeUp>
    </Stagger>
  )
}
