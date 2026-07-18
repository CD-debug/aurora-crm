'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowUpRight, ArrowDownRight, Minus, Users, DollarSign, Clock, Target, TrendingUp } from 'lucide-react'
import { AuroraArcStepper } from '@/components/shared'

interface MetricCardProps {
  title: string
  value: string | number
  change?: { value: number; label: string }
  icon: React.ReactNode
  href?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  description?: string
}

const metricColors = {
  primary: 'border-l-primary bg-primary/5',
  success: 'border-l-green-500 bg-green-500/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  danger: 'border-l-red-500 bg-red-500/5',
  info: 'border-l-blue-500 bg-blue-500/5',
}

export function MetricCard({ title, value, change, icon, href, color = 'primary', description }: MetricCardProps) {
  const content = (
    <div className={cn('p-5 rounded-xl border transition-all hover:shadow-md', metricColors[color])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn('text-sm font-medium', change.value >= 0 ? 'text-green-600' : 'text-red-600')}>
                {change.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-muted-foreground">{change.label}</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-background border border-border">
          {icon}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }
  return <div>{content}</div>
}

interface StageBreakdownProps {
  stages: Array<{ stage: string; count: number; label: string; color: string }>
  total: number
}

export function StageBreakdown({ stages, total }: StageBreakdownProps) {
  return (
    <div className="p-5 rounded-xl border bg-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline Distribution</h3>
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-8 flex justify-center">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            </div>
            <span className="text-sm font-medium text-foreground min-w-[100px]">{s.label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: total > 0 ? `${(s.count / total) * 100}%` : '0%', backgroundColor: s.color }}
              />
            </div>
            <span className="text-sm font-mono tabular-nums text-muted-foreground w-12 text-right">
              {total > 0 ? `${Math.round((s.count / total) * 100)}%` : '0%'}
            </span>
            <span className="text-sm font-mono tabular-nums text-foreground w-10 text-right">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}