'use client'

// Global search / floating command palette: Cmd/Ctrl+K or click the
// search icon to open a floating panel anchored to the nav rail. Live
// name/phone/email matching, Enter routes to Client 360, Esc closes.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, User, Phone, Mail } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ClientHealthBadge } from './badges'
import { createClient } from '@/lib/supabase/client'
import { searchClients } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { cn } from '@/lib/utils'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const { data: results = [], isFetching } = useQuery({
    queryKey: queryKeys.clients.search(query),
    queryFn: () => searchClients(supabase, query),
    enabled: open && query.trim().length >= 2,
    staleTime: 30_000,
  })

  const handleSelect = (clientId: string) => {
    setOpen(false)
    setQuery('')
    router.push(`/clients/${clientId}`)
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'group relative flex items-center justify-center w-12 h-11 rounded-xl transition-all duration-150',
          open
            ? 'text-foreground bg-primary/10'
            : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:scale-110'
        )}
        aria-label="Search clients (Cmd+K)"
        aria-expanded={open}
        tabIndex={0}
      >
        <Search className="w-5 h-5" aria-hidden="true" />
        <span
          className={cn(
            'absolute left-full ml-3 px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium pointer-events-none',
            'bg-foreground text-background shadow-lg border border-border/30',
            'opacity-0 -translate-x-1 scale-95 transition-all duration-150 ease-out',
            'group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100',
            'group-focus-visible:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:scale-100'
          )}
        >
          <span className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45 -mr-1 rounded-sm" />
          Search · ⌘K
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, x: -8, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-16 top-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[calc(100vw-5rem)]"
            role="dialog"
            aria-label="Search clients"
          >
            <div className="rounded-xl border bg-popover shadow-xl overflow-hidden">
              <Command shouldFilter={false} className="bg-popover">
                <CommandInput
                  placeholder="Search clients by name, phone, or email…"
                  value={query}
                  onValueChange={setQuery}
                  autoFocus
                />
                <CommandList className="max-h-[420px]">
                  <CommandGroup>
                    {query.trim().length < 2 && (
                      <div className="py-8 px-3 text-center text-sm text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Keep typing to search your caseload.
                      </div>
                    )}
                    {isFetching && query.trim().length >= 2 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Searching…
                      </div>
                    )}
                    {!isFetching && query.trim().length >= 2 && results.length === 0 && (
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                        No clients match "{query}".
                      </CommandEmpty>
                    )}
                    {results.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.id}
                        onSelect={() => handleSelect(client.id)}
                        className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-md aria-selected:bg-primary/10"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <User className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium truncate">{client.name}</span>
                          <span className="ml-auto flex-shrink-0">
                            <ClientHealthBadge status={client.health_status} />
                          </span>
                        </div>
                        <div className="flex items-center gap-3 ml-6 text-xs text-muted-foreground w-full">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Phone className="h-3 w-3" /> {client.phone}
                          </span>
                          <span className="flex items-center gap-1 truncate min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </span>
                          <span className="font-mono ml-auto flex-shrink-0">{client.state}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
