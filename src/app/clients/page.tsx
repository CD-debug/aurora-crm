'use client'

// Clients directory (PRD §10) — the governing index of the whole system.
// One query (clients_with_health), filtered/sorted client-side with all
// state in the URL (PRD §7.3), health + mini Aurora Arc per row, and
// duplicate detection at the point of creation.

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ChevronUp, ChevronDown, Search, X, Plus, MoreHorizontal, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { NavRail, AuroraArcStepper, ClientHealthBadge, StageBadge } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { fetchClients, invalidateAfterMutation } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { createClientRecord, deleteClient } from '@/lib/data/mutations'
import { filterClients, HEALTH_LABELS, STAGE_LABELS } from '@/lib/data/domain'
import type { ClientWithHealth } from '@/lib/data/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SORTABLE = ['name', 'state', 'health_status', 'stage', 'last_contact_at'] as const
type SortKey = (typeof SORTABLE)[number]

const EMPTY_FORM = { name: '', phone: '', email: '', state: '', zip: '', tags: '' }

function ClientsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [supabase] = useState(() => createClient())

  const { data: clients = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => fetchClients(supabase),
  })

  // --- URL-driven filter/sort state (PRD §7.3) -----------------------------
  const filters = {
    search: searchParams.get('search') ?? '',
    health: searchParams.get('health') ?? '',
    state: searchParams.get('state') ?? '',
    stage: searchParams.get('stage') ?? '',
    tag: searchParams.get('tag') ?? '',
  }
  const sortKey = (searchParams.get('sort') as SortKey) || 'name'
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`/clients?${params.toString()}`, { scroll: false })
  }

  const handleSort = (key: SortKey) => {
    setParams({
      sort: key,
      dir: sortKey === key && sortDir === 'asc' ? 'desc' : 'asc',
    })
  }

  // --- Derived list ----------------------------------------------------------
  const visible = useMemo(() => {
    const filtered = filterClients(clients, filters)
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return av < bv ? -dir : av > bv ? dir : 0
    })
  }, [clients, filters.search, filters.health, filters.state, filters.stage, filters.tag, sortKey, sortDir])

  const allStates = useMemo(() => [...new Set(clients.map((c) => c.state))].sort(), [clients])
  const allTags = useMemo(() => [...new Set(clients.flatMap((c) => c.tags))].sort(), [clients])
  const hasFilters = Object.values(filters).some(Boolean)

  // --- Add client ------------------------------------------------------------
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<Array<Pick<ClientWithHealth, 'id' | 'name' | 'email' | 'phone'>>>([])

  const submitNewClient = async (allowDuplicate = false) => {
    setSaving(true)
    try {
      const result = await createClientRecord(
        {
          name: form.name,
          phone: form.phone,
          email: form.email,
          state: form.state,
          zip: form.zip,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        },
        { allowDuplicate }
      )
      if (result.status === 'duplicates') {
        setDuplicates(result.matches)
        return
      }
      await invalidateAfterMutation(queryClient, result.client.id)
      toast.success(`${result.client.name} added to your caseload`)
      setAddOpen(false)
      setForm(EMPTY_FORM)
      setDuplicates([])
      router.push(`/clients/${result.client.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add this client. Check the details and try again.")
    } finally {
      setSaving(false)
    }
  }

  // --- Delete ----------------------------------------------------------------
  const [deleteTarget, setDeleteTarget] = useState<ClientWithHealth | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClient(deleteTarget.id)
      await invalidateAfterMutation(queryClient)
      toast.success(`${deleteTarget.name} and their case records were deleted`)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete this client. Try again.")
    } finally {
      setDeleting(false)
    }
  }

  const SortHead = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <TableHead className={cn('cursor-pointer select-none hover:bg-muted', className)} onClick={() => handleSort(k)}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </div>
    </TableHead>
  )

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-heading font-semibold tracking-tight">Clients</h1>
              <p className="text-muted-foreground mt-1">Your full case directory — click any row to open Client 360</p>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>

          {/* Filter bar */}
          <div className="mb-4 p-4 rounded-lg border bg-card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, or email…"
                  value={filters.search}
                  onChange={(e) => setParams({ search: e.target.value || null })}
                  className="pl-10"
                />
              </div>
              <select
                value={filters.health}
                onChange={(e) => setParams({ health: e.target.value || null })}
                className="px-3 py-2 border rounded-md bg-background text-sm"
                aria-label="Filter by health"
              >
                <option value="">All Health</option>
                {Object.entries(HEALTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                value={filters.stage}
                onChange={(e) => setParams({ stage: e.target.value || null })}
                className="px-3 py-2 border rounded-md bg-background text-sm"
                aria-label="Filter by stage"
              >
                <option value="">All Stages</option>
                <option value="active">Active (not resolved)</option>
                {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                value={filters.state}
                onChange={(e) => setParams({ state: e.target.value || null })}
                className="px-3 py-2 border rounded-md bg-background text-sm"
                aria-label="Filter by state"
              >
                <option value="">All States</option>
                {allStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {allTags.length > 0 && (
                <select
                  value={filters.tag}
                  onChange={(e) => setParams({ tag: e.target.value || null })}
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                  aria-label="Filter by tag"
                >
                  <option value="">All Tags</option>
                  {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => router.replace('/clients')}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="rounded-lg border bg-card p-4 space-y-3" aria-label="Loading clients">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded-md bg-muted/60 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">{error instanceof Error ? error.message : "Couldn't load clients. Check your connection and try again."}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center">
              {hasFilters ? (
                <>
                  <p className="text-muted-foreground mb-4">No clients match these filters.</p>
                  <Button variant="outline" onClick={() => router.replace('/clients')}>Clear filters</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">No clients yet. Add your first client to open a case.</p>
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first client
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortHead label="Name" k="name" />
                    <TableHead>Phone</TableHead>
                    <SortHead label="State" k="state" />
                    <TableHead>ZIP</TableHead>
                    <TableHead>Email</TableHead>
                    <SortHead label="Health" k="health_status" />
                    <SortHead label="Stage" k="stage" />
                    <SortHead label="Last Contact" k="last_contact_at" />
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{client.name}</div>
                        {client.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {client.tags.map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{client.phone}</TableCell>
                      <TableCell>{client.state}</TableCell>
                      <TableCell className="font-mono text-sm">{client.zip}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{client.email}</TableCell>
                      <TableCell><ClientHealthBadge status={client.health_status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AuroraArcStepper currentStage={client.stage} variant="mini" />
                          <span className="text-xs text-muted-foreground">{STAGE_LABELS[client.stage]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {client.last_contact_at
                          ? format(new Date(client.last_contact_at), 'MMM d, yyyy')
                          : 'No contact yet'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Actions for ${client.name}`}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>Open Client 360</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}#properties`)}>Properties</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}#tasks`)}>Tasks</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(client)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="p-3 text-sm text-muted-foreground border-t">
                {visible.length} of {clients.length} client{clients.length !== 1 ? 's' : ''} · Click a row to open Client 360
              </p>
            </div>
          )}
        </div>

        {/* Add Client sheet (with duplicate detection, PRD §10) */}
        <Sheet open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setDuplicates([]) }}>
          <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Client</SheetTitle>
              <SheetDescription>This opens a new case at the Consultation stage.</SheetDescription>
            </SheetHeader>

            {duplicates.length > 0 ? (
              <div className="p-4 space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Possible duplicate{duplicates.length > 1 ? 's' : ''} found
                  </div>
                  <p className="text-sm text-amber-800 mb-3">
                    {duplicates.length === 1 ? 'A client' : 'Clients'} with matching name, email, or phone already
                    {duplicates.length === 1 ? ' exists' : ' exist'}:
                  </p>
                  <ul className="space-y-2">
                    {duplicates.map((d) => (
                      <li key={d.id} className="text-sm bg-card rounded-md border p-2">
                        <span className="font-medium">{d.name}</span>
                        <span className="text-muted-foreground"> — {d.email} · {d.phone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDuplicates([])}>Go back</Button>
                  <Button className="flex-1" disabled={saving} onClick={() => submitNewClient(true)}>
                    {saving ? 'Creating…' : 'Create anyway'}
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); submitNewClient() }}
                className="space-y-4 p-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="nc-name">Full Name *</label>
                  <Input id="nc-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="nc-phone">Phone *</label>
                  <Input id="nc-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="nc-email">Email *</label>
                  <Input id="nc-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="nc-state">State *</label>
                    <Input id="nc-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} required maxLength={2} placeholder="FL" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="nc-zip">ZIP *</label>
                    <Input id="nc-zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} required maxLength={10} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="nc-tags">Tags</label>
                  <Input id="nc-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="VIP, Referral — comma separated" />
                </div>
                <SheetFooter>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? 'Creating…' : 'Create Client'}
                  </Button>
                </SheetFooter>
              </form>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
              <DialogDescription>
                This permanently removes the client along with all their properties, notes, and tasks.
                This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Client'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background">
        <NavRail />
        <main className="flex-1 ml-16 p-8">
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-md bg-muted/60 animate-pulse" />)}</div>
        </main>
      </div>
    }>
      <ClientsPageContent />
    </Suspense>
  )
}
