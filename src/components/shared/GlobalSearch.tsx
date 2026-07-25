'use client'

// Global search / command palette (PRD §7.1): persistent in the nav rail,
// Cmd/Ctrl+K to open, live name/phone/email matching, Enter routes straight
// to Client 360, Esc closes.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ClientHealthBadge } from './badges'
import { createClient } from '@/lib/supabase/client'
import { searchClients } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { Search, User, Phone, Mail } from 'lucide-react'

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
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition-colors"
        aria-label="Search clients (Cmd+K)"
      >
        <Search className="h-4 w-4 opacity-60" />
        <span className="text-sm font-medium">Search clients…</span>
        <span className="ml-auto text-xs opacity-50 font-mono">⌘K</span>
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
                No clients match “{query}”.
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
