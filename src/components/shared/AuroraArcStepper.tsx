'use client'

import { cn } from '@/lib/utils'
import { ChevronRight, Check, Clock, AlertTriangle } from 'lucide-react'

const stages = [
  { id: 'consultation', label: 'Consultation', icon: Clock },
  { id: 'exit_plan', label: 'Exit Plan', icon: ChevronRight },
  { id: 'in_progress', label: 'In Progress', icon: AlertTriangle },
  { id: 'resolved', label: 'Resolved', icon: Check },
] as const

type StageId = typeof stages[number]['id']

interface AuroraArcStepperProps {
  currentStage: StageId
  onStageClick?: (stage: StageId) => void
  variant?: 'full' | 'mini'
  className?: string
}

export function AuroraArcStepper({
  currentStage,
  onStageClick,
  variant = 'full',
  className,
}: AuroraArcStepperProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage)
  const progress = ((currentIndex + 1) / stages.length) * 100

  return (
    <div className={cn('relative', className)}>
      <div
        className="relative h-2 w-full bg-border rounded-full overflow-hidden"
        style={{ ['--arc-progress' as any]: `${progress}%` }}
      >
        <div
          className="absolute inset-y-0 left-0 h-full bg-aurora-arc rounded-full animate-arc-fill"
          style={{ ['--arc-progress' as any]: `${progress}%` }}
        />
        {stages.map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 rounded-full transition-all duration-300"
            style={{
              left: i === 0 ? '2px' : i === stages.length - 1 ? 'calc(100% - 5px)' : `${(i / (stages.length - 1)) * 100}%`,
              borderColor: i <= currentIndex ? 'var(--arc-end)' : 'var(--border)',
              backgroundColor: i < currentIndex ? 'var(--arc-end)' : i === currentIndex ? 'var(--arc-start)' : 'var(--background)',
              zIndex: 10,
            }}
          >
            {i < currentIndex && <Check className="w-full h-full text-primary-foreground" />}
            {i === currentIndex && <div className="w-full h-full" />}
          </div>
        ))}
      </div>

      {variant === 'full' && (
        <div className="flex justify-between mt-4 text-xs font-medium">
          {stages.map((stage, i) => (
            <button
              key={stage.id}
              onClick={() => onStageClick?.(stage.id)}
              disabled={!onStageClick}
              className={cn(
                'flex flex-col items-center gap-1 transition-colors',
                i <= currentIndex
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                !onStageClick && 'cursor-not-allowed'
              )}
              style={{ width: i === 0 || i === stages.length - 1 ? 'auto' : '100%' }}
            >
              <stage.icon className={cn('w-4 h-4', i <= currentIndex ? 'text-primary' : 'text-muted-foreground')} />
              <span className="whitespace-nowrap text-center px-1">{stage.label}</span>
            </button>
          ))}
        </div>
      )}

      {variant === 'mini' && (
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="font-mono text-data">
            {stages[currentIndex]?.label || '—'}
          </span>
        </div>
      )}
    </div>
  )
}