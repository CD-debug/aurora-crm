'use client'

import { cn } from '@/lib/utils'

interface AuroraMarkProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  className?: string
}

const DIMS = { sm: 24, md: 40, lg: 96 }
const FONT_SIZES = { sm: 'text-xs', md: 'text-sm', lg: 'text-3xl' }

function AuroraArcSVG({ size }: { size: number }) {
  const strokeW = Math.max(1.5, size / 14)
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="aurora-arc-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--arc-start)" />
          <stop offset="100%" stopColor="var(--arc-end)" />
        </linearGradient>
      </defs>
      {/* Arc — rising curve from bottom-left, peak at top-center */}
      <path
        d="M4 28 C4 16, 10 4, 24 4"
        stroke="url(#aurora-arc-grad)"
        strokeWidth={strokeW}
        strokeLinecap="round"
        fill="none"
      />
      {/* Dot at the arc's apex peak */}
      <circle cx="24" cy="4" r={size / 12} fill="var(--arc-end)" />
    </svg>
  )
}

export function AuroraMark({ size = 'md', showWordmark = false, className }: AuroraMarkProps) {
  const dim = DIMS[size]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex items-center justify-center" style={{ width: dim, height: dim }}>
        <AuroraArcSVG size={dim} />
      </span>
      {showWordmark && (
        <span
          className={cn(
            'font-heading font-medium tracking-[-0.02em] text-foreground',
            FONT_SIZES[size]
          )}
        >
          Aurora
        </span>
      )}
    </span>
  )
}

/** Wordmark-only for space-constrained layouts */
export function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = FONT_SIZES[size]
  return (
    <span className={cn('font-heading font-medium tracking-[-0.02em] text-foreground', textSize)}>
      Aurora
    </span>
  )
}
