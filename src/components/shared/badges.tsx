import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { HealthStatus, PipelineStage, TaskStatus } from '@/lib/data/types'
import { HEALTH_LABELS, STAGE_LABELS } from '@/lib/data/domain'

const healthVariants: Record<HealthStatus, string> = {
  on_track: 'bg-surface-success text-surface-success-fg border-surface-success-fg/30',
  at_risk: 'bg-surface-warning text-surface-warning-fg border-surface-warning-fg/30',
  stalled: 'bg-surface-danger text-surface-danger-fg border-surface-danger-fg/30',
}

export function ClientHealthBadge({ status, className }: { status: HealthStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(healthVariants[status], className)}>
      {HEALTH_LABELS[status]}
    </Badge>
  )
}

const taskVariants: Record<TaskStatus, string> = {
  upcoming: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  overdue: 'bg-surface-danger text-surface-danger-fg border-surface-danger-fg/30',
  completed: 'bg-surface-success text-surface-success-fg border-surface-success-fg/30',
}

const taskLabels: Record<TaskStatus, string> = {
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Completed',
}

/** dueSoon renders an amber "Due Soon" in place of the plain Upcoming badge. */
export function TaskStatusBadge({
  status,
  dueSoon = false,
  className,
}: {
  status: TaskStatus
  dueSoon?: boolean
  className?: string
}) {
  if (status === 'upcoming' && dueSoon) {
    return (
      <Badge variant="outline" className={cn('bg-surface-warning text-surface-warning-fg border-surface-warning-fg/30', className)}>
        Due Soon
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn(taskVariants[status], className)}>
      {taskLabels[status]}
    </Badge>
  )
}

const stageVariants: Record<PipelineStage, string> = {
  consultation: 'bg-chart-1/10 text-chart-1 border-chart-1/30',
  exit_plan: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  in_progress: 'bg-surface-warning text-surface-warning-fg border-surface-warning-fg/30',
  resolved: 'bg-surface-success text-surface-success-fg border-surface-success-fg/30',
}

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  return (
    <Badge variant="outline" className={cn(stageVariants[stage], className)}>
      {STAGE_LABELS[stage]}
    </Badge>
  )
}
