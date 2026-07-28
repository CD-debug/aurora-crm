'use client'

// Searchable client combobox — a Popover + cmdk hybrid.
// Used wherever a user needs to pick a client from many: shows a button
// with the current selection, opens a search-and-pick popover.

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronsUpDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ClientHealthBadge } from './badges'

interface Client {
  id: string
  name: string
  health_status: 'on_track' | 'at_risk' | 'stalled'
  state?: string
}

interface ClientComboboxProps {
  clients: Client[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  ariaLabel?: string
  /** If true, no client selection shows a "Pick a client" prompt instead of hiding. */
  required?: boolean
  className?: string
}

export function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = 'Pick a client…',
  ariaLabel = 'Select client',
  required = false,
  className,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = clients.find((c) => c.id === value)

  if (!required && !value) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn('h-9 px-2 text-muted-foreground', className)}
        aria-label={ariaLabel}
      >
        <User className="w-4 h-4 mr-1.5" />
        Any client
        <ChevronsUpDown className="w-3 h-3 ml-1 opacity-50" />
      </Button>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          'h-9 px-2.5 gap-1.5 justify-start font-normal',
          !selected && 'text-muted-foreground'
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        {selected ? (
          <>
            <User className="w-4 h-4 text-primary" />
            <span className="truncate max-w-[140px]">{selected.name}</span>
            <ClientHealthBadge status={selected.health_status} />
          </>
        ) : (
          <>
            <User className="w-4 h-4" />
            {placeholder}
          </>
        )}
        <ChevronsUpDown className="w-3 h-3 ml-auto opacity-50" />
      </Button>

      {open && (
        <>
          {/* Backdrop catches outside clicks */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            aria-label={ariaLabel}
            className="absolute left-0 top-full mt-1 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover shadow-xl"
          >
            <Command shouldFilter>
              <CommandInput
                placeholder="Search by name…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false)
                }}
              />
              <CommandList className="max-h-[320px]">
                <CommandEmpty>
                  <span className="text-muted-foreground text-sm py-2 block">
                    No client matches.
                  </span>
                </CommandEmpty>
                <CommandGroup>
                  {clients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={c.name}
                      onSelect={() => {
                        onChange(c.id === value ? null : c.id)
                        setOpen(false)
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 aria-selected:bg-primary/10"
                    >
                      <User className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="truncate">{c.name}</span>
                      <ClientHealthBadge status={c.health_status} />
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4 flex-shrink-0',
                          value === c.id ? 'opacity-100 text-primary' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </>
      )}
    </div>
  )
}
