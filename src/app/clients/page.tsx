'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { NavRail, Toaster, AuroraArcStepper, ClientHealthBadge, StageBadge } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { ChevronUp, ChevronDown, Search, X, Tag, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  state: string
  zip: string
  stage: 'consultation' | 'exit_plan' | 'in_progress' | 'resolved'
  health_status: 'on_track' | 'at_risk' | 'stalled'
  created_at: string
  updated_at: string
}

const STAGE_LABELS = {
  consultation: 'Consultation',
  exit_plan: 'Exit Plan',
  in_progress: 'In Progress',
  resolved: 'Resolved',
} as const

function ClientsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' })
  
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '', phone: '', email: '', state: '', zip: ''
  })

  const filters = {
    search: searchParams.get('search') || '',
    health: searchParams.get('health') || '',
    state: searchParams.get('state') || '',
    stage: searchParams.get('stage') || '',
  }

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.set('search', filters.search)
      if (filters.health) params.set('health', filters.health)
      if (filters.state) params.set('state', filters.state)
      if (filters.stage) params.set('stage', filters.stage)
      params.set('sort', sortConfig.key)
      params.set('direction', sortConfig.direction)
      
      const response = await fetch(`/api/clients?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }, [filters, sortConfig])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/clients?${params.toString()}`)
  }

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient)
      })
      if (response.ok) {
        setAddClientOpen(false)
        setNewClient({ name: '', phone: '', email: '', state: '', zip: '' })
        fetchClients()
      }
    } catch (error) {
      console.error('Failed to create client:', error)
    }
  }

  const getUniqueValues = (key: keyof Client) => {
    const values = new Set(clients.map(c => c[key]).filter(Boolean))
    return Array.from(values).sort()
  }

  const sortedClients = [...clients].sort((a, b) => {
    const aVal = a[sortConfig.key as keyof Client]
    const bVal = b[sortConfig.key as keyof Client]
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto transition-all duration-200 lg:ml-64">
        <Toaster />
        
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-heading font-semibold tracking-tight">Clients</h1>
              <p className="text-muted-foreground mt-1">Manage your case directory</p>
            </div>
            <Sheet open={addClientOpen} onOpenChange={setAddClientOpen}>
              <SheetTrigger><Button variant="outline">
                  <Tag className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Add New Client</SheetTitle>
                  <SheetDescription>Enter client information to create a new case</SheetDescription>
                </SheetHeader>
                <form onSubmit={handleAddClient} className="space-y-4 p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name *</label>
                    <Input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone *</label>
                    <Input type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">State *</label>
                      <Input value={newClient.state} onChange={e => setNewClient({...newClient, state: e.target.value})} required maxLength={2} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">ZIP *</label>
                      <Input value={newClient.zip} onChange={e => setNewClient({...newClient, zip: e.target.value})} required maxLength={5} />
                    </div>
                  </div>
                  <SheetFooter>
                    <Button type="submit" className="w-full">Create Client</Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>

          {/* Filters */}
          <div className="mb-4 p-4 rounded-lg border bg-card">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, email..."
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filters.health}
                onChange={e => handleFilterChange('health', e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">All Health</option>
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="stalled">Stalled</option>
              </select>
              <select
                value={filters.state}
                onChange={e => handleFilterChange('state', e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">All States</option>
                {getUniqueValues('state').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={filters.stage}
                onChange={e => handleFilterChange('stage', e.target.value)}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="">All Stages</option>
                {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {(filters.search || filters.health || filters.state || filters.stage) && (
                <Button variant="ghost" size="sm" onClick={() => router.push('/clients')}>
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Client Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading clients...</div>
            ) : sortedClients.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No clients found</p>
                <Button onClick={() => setAddClientOpen(true)}>Add your first client</Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Name
                          {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('phone')}>Phone</TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('state')}>State</TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('zip')}>ZIP</TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('email')}>Email</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedClients.map((client) => (
                      <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/clients/${client.id}`)}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.phone}</TableCell>
                        <TableCell>{client.state}</TableCell>
                        <TableCell>{client.zip}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>
                          <ClientHealthBadge status={client.health_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StageBadge stage={client.stage} />
                            <AuroraArcStepper currentStage={client.stage} variant="mini" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger><Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}#properties`)}>Properties</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}#tasks`)}>Tasks</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TableCaption className="p-4 text-sm text-muted-foreground">
                  {sortedClients.length} client{sortedClients.length !== 1 ? 's' : ''} &bull; Click a row to view details
                </TableCaption>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading clients...</div>}>
      <ClientsPageContent />
    </Suspense>
  )
}