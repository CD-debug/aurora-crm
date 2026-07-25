'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AuroraArcStepper } from '@/components/shared'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  href?: string
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  description?: string
}

const metricColors = {
  primary: 'border-l-primary',
  success: 'border-l-green-500',
  warning: 'border-l-amber-500',
  danger: 'border-l-red-500',
  info: 'border-l-blue-500',
}

export function MetricCard({ title, value, icon, href, color = 'primary', description }: MetricCardProps) {
  const content = (
    <div className={cn('p-4 rounded-lg border border-l-4 transition-colors hover:bg-muted/30', metricColors[color])}>
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
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