import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { HealthStatus, PipelineStage, TaskStatus } from '@/lib/data/types'
import { HEALTH_LABELS, STAGE_LABELS } from '@/lib/data/domain'

const healthVariants: Record<HealthStatus, string> = {
  on_track: 'bg-green-100 text-green-800 border-green-200',
  at_risk: 'bg-amber-100 text-amber-800 border-amber-200',
  stalled: 'bg-red-100 text-red-800 border-red-200',
}

export function ClientHealthBadge({ status, className }: { status: HealthStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(healthVariants[status], className)}>
      {HEALTH_LABELS[status]}
    </Badge>
  )
}

const taskVariants: Record<TaskStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
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
      <Badge variant="outline" className={cn('bg-amber-100 text-amber-800 border-amber-200', className)}>
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
  consultation: 'bg-blue-100 text-blue-800 border-blue-200',
  exit_plan: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
}

export function StageBadge({ stage, className }: { stage: PipelineStage; className?: string }) {
  return (
    <Badge variant="outline" className={cn(stageVariants[stage], className)}>
      {STAGE_LABELS[stage]}
    </Badge>
  )
}
