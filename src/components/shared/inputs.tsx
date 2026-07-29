'use client'

// Smart input primitives for intake forms. Each one handles its own
// display formatting while exposing a clean value to the parent form:
//   PhoneInput    — "(XXX) XXX-XXXX" live formatting, stores raw digits-preserved string
//   CurrencyInput — "$" prefix + comma grouping, stores numeric string
//   SsnInput      — numeric-only, hard-capped at 4 digits
//   YesNoToggle   — segmented Yes/No control
//   ConditionalField — animated height+opacity collapse for conditional reveals

import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// PhoneInput — auto-formats US numbers as (XXX) XXX-XXXX while typing.
// The stored value keeps the formatted shape (max 14 chars) so validation
// and display stay in sync; digits-only normalization happens in domain.ts.
// ---------------------------------------------------------------------------
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = '(555) 123-4567',
  required,
  disabled,
  className,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}) {
  const autoId = useId()
  return (
    <input
      id={id ?? autoId}
      type="tel"
      inputMode="tel"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={cn(
        'w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono tabular-nums',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        'disabled:opacity-50',
        className
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// CurrencyInput — "$" prefix with comma grouping on blur.
// Internally keeps the raw numeric string so forms submit clean numbers.
// ---------------------------------------------------------------------------
export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = '0.00',
  disabled,
  className,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const autoId = useId()
  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <input
        id={id ?? autoId}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          // Keep digits + one decimal point; strip everything else
          const cleaned = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
          onChange(cleaned)
        }}
        onBlur={() => {
          // Add comma grouping for readability when the user leaves the field
          if (value) {
            const num = Number(value)
            if (!Number.isNaN(num)) onChange(num.toLocaleString('en-US', { maximumFractionDigits: 2 }))
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border bg-background pl-7 pr-3 py-2 text-sm font-mono tabular-nums',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:opacity-50'
        )}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// SsnInput — numeric-only, hard-capped at exactly 4 digits (last-4 of SSN).
// Never renders anything but what the user typed (display surfaces show ••••).
// ---------------------------------------------------------------------------
export function SsnInput({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  className?: string
}) {
  const autoId = useId()
  return (
    <input
      id={id ?? autoId}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      placeholder="1234"
      maxLength={4}
      disabled={disabled}
      className={cn(
        'w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono tabular-nums tracking-[0.3em]',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        'disabled:opacity-50',
        className
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// YesNoToggle — segmented Yes/No control for boolean fields.
// ---------------------------------------------------------------------------
export function YesNoToggle({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string
  value: boolean | null
  onChange: (v: boolean) => void
  disabled?: boolean
  className?: string
}) {
  const autoId = useId()
  return (
    <div
      id={id ?? autoId}
      role="group"
      aria-label="Yes or No"
      className={cn('inline-flex rounded-md border overflow-hidden text-sm', disabled && 'opacity-50', className)}
    >
      {([true, false] as const).map((opt) => {
        const active = value === opt
        return (
          <button
            key={String(opt)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={cn(
              'px-4 py-1.5 font-medium transition-colors',
              active
                ? opt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted-foreground/20 text-foreground'
                : 'hover:bg-muted text-muted-foreground'
            )}
          >
            {opt ? 'Yes' : 'No'}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ConditionalField — smooth height+opacity collapse for fields that only
// apply when a toggle is set a certain way (e.g. "If No — How far behind?").
// ---------------------------------------------------------------------------
export function ConditionalField({
  show,
  children,
}: {
  show: boolean
  children: React.ReactNode
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
