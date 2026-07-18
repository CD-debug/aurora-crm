import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const healthVariants = {
  on_track: 'bg-green-100 text-green-800 border-green-200',
  at_risk: 'bg-amber-100 text-amber-800 border-amber-200',
  stalled: 'bg-red-100 text-red-800 border-red-200',
} as const

const taskVariants = {
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
} as const

interface ClientHealthBadgeProps {
  status: 'on_track' | 'at_risk' | 'stalled'
  className?: string
}

export function ClientHealthBadge({ status, className }: ClientHealthBadgeProps) {
  const labels = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    stalled: 'Stalled',
  }
  return (
    <Badge variant="outline" className={cn(healthVariants[status], className)}>
      {labels[status]}
    </Badge>
  )
}

interface TaskStatusBadgeProps {
  status: 'pending' | 'overdue' | 'completed'
  className?: string
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const labels = {
    pending: 'Upcoming',
    overdue: 'Overdue',
    completed: 'Completed',
  }
  return (
    <Badge variant="outline" className={cn(taskVariants[status], className)}>
      {labels[status]}
    </Badge>
  )
}

interface StageBadgeProps {
  stage: 'consultation' | 'exit_plan' | 'in_progress' | 'resolved'
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const labels = {
    consultation: 'Consultation',
    exit_plan: 'Exit Plan',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  }
  const variants = {
    consultation: 'bg-blue-100 text-blue-800',
    exit_plan: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-amber-100 text-amber-800',
    resolved: 'bg-green-100 text-green-800',
  }
  return (
    <Badge variant="outline" className={cn(variants[stage], className)}>
      {labels[stage]}
    </Badge>
  )
}