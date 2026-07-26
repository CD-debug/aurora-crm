'use client'

import { motion, useMotionValue, useTransform, animate, type Variants } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

// ─── Page entrance: staggered children ───────────────────────────────────────
const staggerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export function Stagger({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ ...staggerVariants, visible: { transition: { staggerChildren: 0.06, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Fade-in from below (default child variant) ─────────────────────────────
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export function FadeUp({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUpVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Hover lift card ────────────────────────────────────────────────────────
export function HoverLift({ children, className }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Count-up number ────────────────────────────────────────────────────────
export function CountUp({ value, duration = 1.2, decimals = 0, prefix = '', suffix = '' }: {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState('0')
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    if (hasAnimated) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true)
          const start = performance.now()
          const step = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / (duration * 1000), 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            const current = eased * value
            setDisplay(current.toFixed(decimals))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [value, duration, decimals, hasAnimated])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display}{suffix}
    </span>
  )
}

// ─── Scale-in (for checkmarks, badges) ──────────────────────────────────────
export function ScaleIn({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Progress bar fill ──────────────────────────────────────────────────────
export function ProgressBar({ value, className, color }: {
  value: number
  className?: string
  color?: string
}) {
  return (
    <div className={`h-full rounded-full overflow-hidden ${className ?? ''}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color ?? 'var(--primary)' }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}
