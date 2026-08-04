'use client'

import { useTransition, useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { updateTheme } from '@/lib/data/settings-actions'
import { cn } from '@/lib/utils'

type ThemeMode = 'light' | 'dark' | 'system'

const CYCLE: ThemeMode[] = ['light', 'dark', 'system']

function readCookie(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  const m = document.cookie.match(/(?:^|;\s*)aurora-theme=([^;]+)/)
  const v = m?.[1]
  if (v === 'dark' || v === 'light' || v === 'system') return v
  return 'light'
}

export function ThemeToggle({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<ThemeMode>('light')

  useEffect(() => {
    setMode(readCookie())
  }, [])

  const apply = (next: ThemeMode) => {
    const previous = mode
    setMode(next)
    const root = document.documentElement
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = next === 'dark' || (next === 'system' && sysDark)
    root.classList.toggle('dark', shouldBeDark)
    startTransition(async () => {
      try {
        await updateTheme(next)
      } catch (e) {
        setMode(previous)
        const revertDark = previous === 'dark' || (previous === 'system' && sysDark)
        root.classList.toggle('dark', revertDark)
        toast.error(e instanceof Error ? e.message : "Couldn't switch theme. Try again.")
      }
    })
  }

  const cycle = () => {
    const i = CYCLE.indexOf(mode)
    apply(CYCLE[(i + 1) % CYCLE.length])
  }

  const Icon = mode === 'dark' ? Moon : mode === 'system' ? Monitor : Sun
  const label = `Theme: ${mode} (click to switch)`

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={pending}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-foreground',
        'hover:bg-muted/60 hover:border-foreground/20 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:opacity-60',
        className,
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  )
}
