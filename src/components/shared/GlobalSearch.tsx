'use client'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, CommandItem } from '@/components/ui/command'
import { Search, User, Phone, Mail } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ClientSearchResult {
  id: string
  name: string
  phone: string
  email: string
  state: string
  stage: string
  health_status: string
}

export function GlobalSearch() {
  const [results, setResults] = useState<ClientSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const supabase = createClient()

  const searchClients = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, email, state, stage, health_status')
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10)
      if (!error && data) setResults(data as ClientSearchResult[])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        // Command component handles its own open state
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = (client: ClientSearchResult) => {
    setQuery('')
    setResults([])
    window.location.href = `/clients/${client.id}`
  }

  return (
    <>
      <button
        onClick={() => {}}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition-colors"
        aria-label="Global search (Cmd+K)"
      >
        <Search className="h-4 w-4 opacity-60" />
        <span className="text-sm font-medium">Search clients…</span>
        <span className="ml-auto text-xs opacity-50 font-mono">⌘K</span>
      </button>

      <Command>
        <CommandInput
          placeholder="Search by name, phone, or email…"
          value={query}
          onValueChange={setQuery}
          className="w-full"
        />
        <CommandList className="max-h-[400px]">
          <CommandGroup>
            {loading && <CommandItem className="py-4 text-center text-muted-foreground">Searching…</CommandItem>}
            {results.length === 0 && !loading && query.length >= 2 && (
              <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                No clients found matching "{query}"
              </CommandEmpty>
            )}
            {results.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => handleSelect(client)}
                className="flex flex-col items-start gap-1 px-3 py-2 hover:bg-sidebar-accent"
              >
                <div className="flex items-center gap-2 w-full">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">{client.name}</span>
                  <span className={`ml-auto px-2 py-0.5 text-xs rounded-full border ${
                    client.health_status === 'on_track' ? 'bg-green-100 text-green-800 border-green-200' :
                    client.health_status === 'at_risk' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {client.health_status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-6 text-xs text-muted-foreground w-full">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>
                  <span className="font-mono">{client.state}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </>
  )
}