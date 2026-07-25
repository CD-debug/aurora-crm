'use client'

// The Aurora Arc (PRD §8.5): a thin gradient bar filling Horizon Teal →
// Dusk Indigo as a case advances, full at Resolved. `full` = clickable
// pipeline stepper for Client 360; `mini` = row indicator for the directory.

import { cn } from '@/lib/utils'
import { STAGES, STAGE_LABELS, stageIndex, stagePercent } from '@/lib/data/domain'
import type { PipelineStage } from '@/lib/data/types'
import { Check } from 'lucide-react'

interface AuroraArcStepperProps {
  currentStage: PipelineStage
  onStageClick?: (stage: PipelineStage) => void
  variant?: 'full' | 'mini'
  className?: string
}

export function AuroraArcStepper({
  currentStage,
  onStageClick,
  variant = 'full',
  className,
}: AuroraArcStepperProps) {
  const currentIndex = stageIndex(currentStage)
  const progress = stagePercent(currentStage)

  if (variant === 'mini') {
    return (
      <div
        className={cn('relative h-1.5 w-16 rounded-full bg-border overflow-hidden', className)}
        role="img"
        aria-label={`Pipeline stage: ${STAGE_LABELS[currentStage]}`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-aurora-arc rounded-full animate-arc-fill"
          style={{ ['--arc-progress' as never]: `${progress}%`, width: `${progress}%` }}
        />
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Track + fill; fill reaches the current node (resolved = 100%) */}
      <div className="relative h-2 w-full rounded-full bg-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 h-full bg-aurora-arc rounded-full animate-arc-fill"
          style={{ ['--arc-progress' as never]: `${progress}%`, width: `${progress}%` }}
        />
      </div>

      {/* Nodes + labels: the whole column for a stage is the click target */}
      <div className="flex justify-between -mt-[13px]">
        {STAGES.map((stage, i) => {
          const isPast = i < currentIndex
          const isCurrent = i === currentIndex
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageClick?.(stage)}
              disabled={!onStageClick || isCurrent}
              className={cn(
                'group flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-1',
                onStageClick && !isCurrent ? 'cursor-pointer' : 'cursor-default'
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-full border-2 bg-background transition-colors',
                  isPast && 'border-[var(--arc-end)] bg-[var(--arc-end)] text-primary-foreground',
                  isCurrent && 'border-[var(--arc-start)] bg-[var(--arc-start)]',
                  !isPast && !isCurrent && 'border-border group-hover:border-[var(--arc-start)]'
                )}
              >
                {isPast && <Check className="w-3 h-3" />}
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
              </span>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
