'use client'

// Global search / command palette: Cmd/Ctrl+K to open, live name/phone/email
// matching, Enter routes to Client 360, Esc closes.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ClientHealthBadge } from './badges'
import { createClient } from '@/lib/supabase/client'
import { searchClients } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { Search, User, Phone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const [supabase] = useState(() => createClient())

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

  const { data: results = [], isFetching } = useQuery({
    queryKey: queryKeys.clients.search(query),
    queryFn: () => searchClients(supabase, query),
    enabled: query.trim().length >= 2,
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
        onClick={() => setOpen(true)}
        className="group relative flex items-center justify-center w-12 h-11 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:scale-110 transition-all duration-150"
        aria-label="Search clients (Cmd+K)"
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

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search clients"
        description="Find a client by name, phone, or email"
      >
        <CommandInput
          placeholder="Type a name, phone number, or email…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[400px]">
          <CommandGroup>
            {query.trim().length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Keep typing to search your caseload.
              </div>
            )}
            {isFetching && query.trim().length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
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
                className="flex flex-col items-start gap-1 px-3 py-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">{client.name}</span>
                  <span className="ml-auto">
                    <ClientHealthBadge status={client.health_status} />
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-6 text-xs text-muted-foreground w-full">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
                  <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {client.email}</span>
                  <span className="font-mono">{client.state}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
