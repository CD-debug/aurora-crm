'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ChevronUp, ChevronDown, Search, X, Receipt, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { NavRail, MobileNavBar, MobileNavDrawer } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { fetchReceivables, invalidateAfterMutation, type ReceivableRow } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { setClosingIssued } from '@/lib/data/mutations'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SORTABLE = ['client_name', 'resort_name', 'resort_settlement', 'invoiced', 'disposition', 'team_member_name', 'is_issued'] as const
type SortKey = (typeof SORTABLE)[number]

const DISPOSITIONS = ['Sent', 'Collected', 'Settled', 'Paid'] as const

function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ReceivablesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [supabase] = useState(() => createClient())

  const { data: receivables = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.receivables.all,
    queryFn: () => fetchReceivables(supabase),
  })

  const filters = {
    search: searchParams.get('search') ?? '',
    disposition: searchParams.get('disposition') ?? '',
    issued: searchParams.get('issued') ?? 'open',
  }
  const sortKey = (searchParams.get('sort') as SortKey) || 'client_name'
  const sortDir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`/receivables?${params.toString()}`, { scroll: false })
  }

  const handleSort = (key: SortKey) => {
    setParams({
      sort: key,
      dir: sortKey === key && sortDir === 'asc' ? 'desc' : 'asc',
    })
  }

  const visible = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const filtered = receivables.filter((r) => {
      if (search) {
        const hay = `${r.client_name} ${r.resort_name}`.toLowerCase()
        if (!hay.includes(search)) return false
      }
      if (filters.disposition && r.disposition !== filters.disposition) return false
      if (filters.issued === 'open' && r.is_issued) return false
      if (filters.issued === 'issued' && !r.is_issued) return false
      return true
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [receivables, filters.search, filters.disposition, filters.issued, sortKey, sortDir])

  const hasFilters = filters.search || filters.disposition || filters.issued !== 'open'

  const [issuedTarget, setIssuedTarget] = useState<ReceivableRow | null>(null)
  const [issuedSaving, setIssuedSaving] = useState(false)

  const confirmIssued = async () => {
    if (!issuedTarget) return
    setIssuedSaving(true)
    try {
      await setClosingIssued(issuedTarget.property_id, issuedTarget.client_id, true)
      await invalidateAfterMutation(queryClient, issuedTarget.client_id)
      toast.success(`${issuedTarget.client_name} marked as issued`)
      setIssuedTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update issued status.")
    } finally {
      setIssuedSaving(false)
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
      <MobileNavBar />
      <MobileNavDrawer />
      <main className="flex-1 lg:ml-16 overflow-auto pb-16 lg:pb-0">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-heading font-semibold tracking-tight">Receivables</h1>
              <p className="text-muted-foreground mt-1">Track settlement amounts and issuance status across all clients.</p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="mb-4 p-4 rounded-lg border bg-card section-accent-indigo">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search client or resort…"
                  value={filters.search}
                  onChange={(e) => setParams({ search: e.target.value || null })}
                  className="pl-10"
                />
              </div>
              <Select value={filters.disposition || 'any'} onValueChange={(v) => setParams({ disposition: v === 'any' ? null : v })}>
                <SelectTrigger className="w-[160px]" aria-label="Filter by disposition">
                  <SelectValue placeholder="All Dispositions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All Dispositions</SelectItem>
                  {DISPOSITIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.issued} onValueChange={(v) => setParams({ issued: v })}>
                <SelectTrigger className="w-[140px]" aria-label="Filter by issued status">
                  <SelectValue placeholder="Open" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => router.replace('/receivables')}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="rounded-lg border bg-card p-4 space-y-3" aria-label="Loading receivables">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded-md bg-muted/60 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <p className="text-muted-foreground">Couldn't load receivables. Try again.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center">
              <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No receivables found. Add a Resort Settlement amount in the Closing section to see it here.</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Client" k="client_name" />
                      <SortHead label="Resort" k="resort_name" />
                      <SortHead label="Resort Settlement" k="resort_settlement" className="text-right" />
                      <SortHead label="Invoiced" k="invoiced" className="text-right" />
                      <SortHead label="Disposition" k="disposition" />
                      <SortHead label="Team Member" k="team_member_name" />
                      <SortHead label="Issued" k="is_issued" className="text-center" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => (
                      <TableRow
                        key={r.property_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/clients/${r.client_id}`)}
                      >
                        <TableCell className="font-medium">{r.client_name}</TableCell>
                        <TableCell>{r.resort_name}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(r.resort_settlement)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatCurrency(r.invoiced)}</TableCell>
                        <TableCell>{r.disposition ?? '—'}</TableCell>
                        <TableCell>{r.team_member_name ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <button
                            role="checkbox"
                            aria-checked={r.is_issued}
                            aria-label={`Mark ${r.client_name} as issued`}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!r.is_issued) setIssuedTarget(r)
                            }}
                            className={cn(
                              'inline-flex h-5 w-5 items-center justify-center rounded border transition-all',
                              r.is_issued
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/50 hover:border-primary hover:bg-primary/10'
                            )}
                          >
                            {r.is_issued && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Issued confirmation dialog */}
      <Dialog open={!!issuedTarget} onOpenChange={(open) => !open && setIssuedTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Issued</DialogTitle>
            <DialogDescription>Have you confirmed this is issued?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssuedTarget(null)} disabled={issuedSaving}>No</Button>
            <Button onClick={confirmIssued} disabled={issuedSaving}>
              {issuedSaving ? 'Saving…' : 'Yes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ReceivablesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-background" />}>
      <ReceivablesPageContent />
    </Suspense>
  )
}
