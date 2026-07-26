'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ClientHealthBadge } from '@/components/shared'
import { Stagger, FadeUp, HoverLift, CountUp } from '@/components/shared/motion'
import type { DashboardData } from '@/lib/data/types'
import { STAGE_LABELS } from '@/lib/data/domain'
import {
  DollarSign, Users, AlertTriangle, AlertCircle, CheckCircle, Clock, Target,
  TrendingUp,
} from 'lucide-react'

function MetricTile({ icon, title, value, numericValue, href, color, delay = 0 }: {
  icon: React.ReactNode
  title: string
  value: string | number
  numericValue?: number
  href?: string
  color: string
  delay?: number
}) {
  const borderColors: Record<string, string> = {
    primary: 'border-l-[var(--primary)]',
    success: 'border-l-green-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
    info: 'border-l-blue-500',
  }

  const inner = (
    <HoverLift>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
        className={`p-5 rounded-xl border border-l-4 bg-card hover:bg-muted/20 transition-colors ${borderColors[color] ?? borderColors.primary}`}
      >
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-0.5">
              {numericValue !== undefined ? (
                <CountUp
                  value={numericValue}
                  prefix={typeof value === 'string' ? (value.startsWith('$') ? '$' : '') : ''}
                  suffix={typeof value === 'string' && value.endsWith('%') ? '%' : ''}
                />
              ) : (
                value
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </HoverLift>
  )

  if (href) {
    return <Link href={href} className="block">{inner}</Link>
  }
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

  return (
    <Stagger className="space-y-6" delay={0.1}>
      {/* Cases row */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile icon={<Users className="w-5 h-5" />} title="Total Cases" value={data.total_cases} numericValue={data.total_cases} href="/clients" color="primary" />
          <MetricTile icon={<Target className="w-5 h-5" />} title="Active" value={data.active_cases} numericValue={data.active_cases} href="/clients?stage=active" color="info" delay={0.05} />
          <MetricTile icon={<CheckCircle className="w-5 h-5" />} title="Resolved" value={data.resolved_cases} numericValue={data.resolved_cases} href="/clients?stage=resolved" color="success" delay={0.1} />
          <MetricTile icon={<Clock className="w-5 h-5" />} title="Avg. Time" value={data.avg_days_to_resolution != null ? `${Math.round(data.avg_days_to_resolution)} days` : '—'} color="info" delay={0.15} />
        </div>
      </FadeUp>

      {/* Health + Performance row */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricTile icon={<AlertTriangle className="w-5 h-5" />} title="At Risk" value={data.at_risk_cases} numericValue={data.at_risk_cases} href="/clients?health=at_risk" color="danger" delay={0.2} />
          <MetricTile icon={<AlertCircle className="w-5 h-5" />} title="Stalled" value={data.stalled_cases} numericValue={data.stalled_cases} href="/clients?health=stalled" color="warning" delay={0.25} />
          <MetricTile icon={<DollarSign className="w-5 h-5" />} title="Debt Eliminated" value={`$${Number(data.total_debt_eliminated).toLocaleString()}`} numericValue={Number(data.total_debt_eliminated)} color="success" delay={0.3} />
          <MetricTile icon={<TrendingUp className="w-5 h-5" />} title="Resolution Rate" value={`${data.resolution_rate.toFixed(1)}%`} numericValue={Math.round(data.resolution_rate)} color="success" delay={0.35} />
        </div>
      </FadeUp>

      {/* Pipeline + Attention */}
      <FadeUp>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline distribution */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="lg:col-span-2 p-6 rounded-xl border bg-card"
          >
            <h3 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wide">Pipeline Distribution</h3>
            {/* Aurora Arc: one continuous bar segmented by stage (PRD §8.5) */}
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
          </motion.div>

          {/* Needs Attention */}
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
