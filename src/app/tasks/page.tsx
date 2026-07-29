'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon, CalendarDays, CheckCircle, ChevronDown,
  ExternalLink, Flame, Plus, Sun, Trash2, User, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NavRail, ClientCombobox } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { fetchClients, fetchTasks, fetchTeamMembers, invalidateAfterMutation } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { createTask, setTaskCompleted, updateTask, deleteTask } from '@/lib/data/mutations'
import { taskStatus } from '@/lib/data/domain'
import type { TaskWithClient } from '@/lib/data/types'
import { cn } from '@/lib/utils'

type QuickFilter = 'overdue' | 'today' | 'week' | 'done' | null
type GroupKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'completed'

function TasksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [supabase] = useState(() => createClient())

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: () => fetchTasks(supabase),
  })
  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => fetchClients(supabase),
  })
  const { data: teamMembers = [] } = useQuery({
    queryKey: queryKeys.teamMembers.all,
    queryFn: () => fetchTeamMembers(supabase),
  })

  const filterClient = searchParams.get('client') ?? ''
  const filterStatus = searchParams.get('status') ?? ''
  const filterDue = searchParams.get('due') ?? ''
  const filterAssignee = searchParams.get('assignee') ?? ''
  const viewAll = searchParams.get('view') === 'all'

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`/tasks?${params.toString()}`, { scroll: false })
  }

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(true)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null)
  const [completedOpen, setCompletedOpen] = useState(viewAll)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const today = startOfDay(new Date())

  // --- Filtering (URL-driven) ------------------------------------------------
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const status = taskStatus(t, today)
      if (filterClient && t.client_id !== filterClient) return false
      if (filterStatus && status !== filterStatus) return false
      if (filterAssignee === 'unassigned' && t.staff_id) return false
      if (filterAssignee && filterAssignee !== 'unassigned' && t.staff_id !== filterAssignee) return false
      if (filterDue && t.due_date !== filterDue) return false
      return true
    })
  }, [tasks, filterClient, filterStatus, filterAssignee, filterDue, today])

  // --- Grouping ---------------------------------------------------------------
  const groups = useMemo(() => {
    const out: Record<GroupKey, TaskWithClient[]> = {
      overdue: [], today: [], tomorrow: [], week: [], later: [], completed: [],
    }
    for (const t of filtered) {
      if (t.completed_at) { out.completed.push(t); continue }
      const diff = differenceInCalendarDays(parseISO(t.due_date), today)
      if (diff < 0) out.overdue.push(t)
      else if (diff === 0) out.today.push(t)
      else if (diff === 1) out.tomorrow.push(t)
      else if (diff <= 7) out.week.push(t)
      else out.later.push(t)
    }
    out.completed.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    return out
  }, [filtered, today])

  const counts = useMemo(() => ({
    overdue: groups.overdue.length,
    today: groups.today.length,
    week: groups.today.length + groups.tomorrow.length + groups.week.length,
    doneToday: groups.completed.filter((t) => t.completed_at && isSameDay(parseISO(t.completed_at), today)).length,
    openTotal: groups.overdue.length + groups.today.length + groups.tomorrow.length + groups.week.length + groups.later.length,
  }), [groups, today])

  const { daysWithTasks, daysWithOverdue } = useMemo(() => {
    const withTasks = new Set<string>()
    const withOverdue = new Set<string>()
    for (const t of tasks) {
      if (t.completed_at) continue
      withTasks.add(t.due_date)
      if (taskStatus(t, today) === 'overdue') withOverdue.add(t.due_date)
    }
    return {
      daysWithTasks: [...withTasks].map((d) => parseISO(d)),
      daysWithOverdue: [...withOverdue].map((d) => parseISO(d)),
    }
  }, [tasks, today])

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  // --- Quick add ----------------------------------------------------------------
  const [quickTitle, setQuickTitle] = useState('')
  const [quickClient, setQuickClient] = useState('')
  const [quickAssigneeId, setQuickAssigneeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aurora-task-assignee')
    return null
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (quickAssigneeId) localStorage.setItem('aurora-task-assignee', quickAssigneeId)
    else localStorage.removeItem('aurora-task-assignee')
  }, [quickAssigneeId])

  const effectiveClient = filterClient || quickClient || (clients.length === 1 ? clients[0].id : '')

  const submitQuickAdd = async () => {
    const dueDate = filterDue || format(today, 'yyyy-MM-dd')
    if (!quickTitle.trim() || !effectiveClient || saving) return
    setSaving(true)
    try {
      await createTask({
        client_id: effectiveClient,
        title: quickTitle.trim(),
        due_date: dueDate,
        staff_id: quickAssigneeId,
      })
      await invalidateAfterMutation(queryClient, effectiveClient)
      setQuickTitle('')
      toast.success('Task created')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create this task. Try again.")
    } finally {
      setSaving(false)
    }
  }

  // --- Task actions ---------------------------------------------------------------
  const toggleComplete = async (task: TaskWithClient) => {
    const completing = !task.completed_at
    try {
      await setTaskCompleted(task.id, task.client_id, completing)
      await invalidateAfterMutation(queryClient, task.client_id)
      toast.success(completing ? 'Task completed' : 'Task reopened')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update this task.")
    }
  }

  const reschedule = async (task: TaskWithClient, newDate: string) => {
    if (!newDate) return
    try {
      await updateTask(task.id, task.client_id, { due_date: newDate })
      await invalidateAfterMutation(queryClient, task.client_id)
      toast.success(`Rescheduled to ${format(parseISO(newDate), 'MMM d, yyyy')}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reschedule this task.")
    }
  }

  const removeTask = async (task: TaskWithClient) => {
    try {
      await deleteTask(task.id, task.client_id)
      await invalidateAfterMutation(queryClient, task.client_id)
      if (selectedId === task.id) setSelectedId(null)
      toast.success('Task deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete this task.")
    }
  }

  const hasFilters = !!(filterClient || filterStatus || filterDue || filterAssignee)

  // --- Rendering helpers -----------------------------------------------------------

  function dueLabel(task: TaskWithClient) {
    const diff = differenceInCalendarDays(parseISO(task.due_date), today)
    if (task.completed_at) return null
    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, tone: 'danger' as const }
    if (diff === 0) return { text: 'Today', tone: 'primary' as const }
    if (diff === 1) return { text: 'Tomorrow', tone: 'default' as const }
    return { text: format(parseISO(task.due_date), 'MMM d'), tone: 'default' as const }
  }

  function TaskRow({ task, tone }: { task: TaskWithClient; tone: 'danger' | 'default' | 'done' }) {
    const expanded = selectedId === task.id
    const due = dueLabel(task)
    const assignee = task.team_members?.name
    const assigneeInitials = assignee
      ? assignee.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
      : ''
    const completed = !!task.completed_at

    return (
      <div className={cn('group border-b last:border-b-0', expanded && 'bg-muted/30')}>
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
          {/* Checkbox */}
          <button
            onClick={() => toggleComplete(task)}
            className="flex-shrink-0"
            aria-label={completed ? 'Reopen task' : 'Complete task'}
          >
            {completed
              ? <CheckCircle className="w-5 h-5 text-chart-5" />
              : <span className={cn(
                  'block w-5 h-5 rounded-full border-2 transition-colors',
                  tone === 'danger' ? 'border-chart-3/60 hover:border-chart-3' : 'border-muted-foreground/40 hover:border-primary',
                )} />}
          </button>

          {/* Title + meta */}
          <button
            onClick={() => setSelectedId(expanded ? null : task.id)}
            className="flex-1 min-w-0 text-left"
          >
            <span className={cn('font-medium text-sm block truncate', completed && 'line-through text-muted-foreground')}>
              {task.title}
            </span>
            <span className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
              <span
                role="link"
                onClick={(e) => { e.stopPropagation(); router.push(`/clients/${task.client_id}#tasks`) }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <User className="w-3 h-3" />
                {task.clients?.name ?? '—'}
              </span>
              {assignee && (
                <span className="inline-flex items-center gap-1" title={`Assigned to ${assignee}`}>
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                    {assigneeInitials}
                  </span>
                  {assignee}
                </span>
              )}
            </span>
          </button>

          {/* Due label */}
          {due && (
            <span className={cn(
              'text-xs font-mono tabular-nums flex-shrink-0',
              due.tone === 'danger' && 'text-chart-3 font-semibold',
              due.tone === 'primary' && 'text-primary font-medium',
              due.tone === 'default' && 'text-muted-foreground',
            )}>
              {due.text}
            </span>
          )}

          {/* Hover quick actions */}
          <div className="flex items-center gap-0.5 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!completed && (
              <>
                <button
                  onClick={() => reschedule(task, format(addDays(today, 1), 'yyyy-MM-dd'))}
                  className="px-1.5 py-1 rounded text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Reschedule to tomorrow"
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => reschedule(task, format(addDays(parseISO(task.due_date), 7), 'yyyy-MM-dd'))}
                  className="px-1.5 py-1 rounded text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Push one week"
                >
                  +1w
                </button>
              </>
            )}
            <button
              onClick={() => removeTask(task)}
              className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Delete task"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pl-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span>Created {format(parseISO(task.created_at), 'MMM d, yyyy')}</span>
                {task.completed_at && <span>Done {format(parseISO(task.completed_at), 'MMM d, yyyy')}</span>}
                <span className="flex items-center gap-1.5">
                  Due
                  <input
                    type="date"
                    defaultValue={task.due_date}
                    onChange={(e) => reschedule(task, e.target.value)}
                    className="h-7 text-xs border border-input rounded-md px-2 bg-background text-foreground"
                  />
                </span>
                <Button
                  size="sm"
                  variant={completed ? 'outline' : 'default'}
                  className="h-7 text-xs"
                  onClick={() => toggleComplete(task)}
                >
                  {completed ? 'Reopen' : 'Mark done'}
                </Button>
                <button
                  onClick={() => router.push(`/clients/${task.client_id}#tasks`)}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open case <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  function TaskGroup({
    title, icon: Icon, tasks: groupTasks, tone = 'default', defaultOpen = true, delay = 0,
  }: {
    title: string
    icon: typeof Sun
    tasks: TaskWithClient[]
    tone?: 'danger' | 'primary' | 'success' | 'default'
    defaultOpen?: boolean
    delay?: number
  }) {
    const [open, setOpen] = useState(defaultOpen)
    if (groupTasks.length === 0) return null
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
        className="rounded-xl border bg-card overflow-hidden"
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <Icon className={cn(
            'w-4 h-4',
            tone === 'danger' && 'text-chart-3',
            tone === 'primary' && 'text-primary',
            tone === 'success' && 'text-chart-5',
            tone === 'default' && 'text-muted-foreground',
          )} />
          <span className={cn('font-semibold text-sm', tone === 'danger' && 'text-chart-3')}>{title}</span>
          <span className={cn(
            'text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-full',
            tone === 'danger' ? 'bg-chart-3/10 text-chart-3' : 'bg-muted text-muted-foreground',
          )}>
            {groupTasks.length}
          </span>
          <ChevronDown className={cn('w-4 h-4 ml-auto text-muted-foreground transition-transform', !open && '-rotate-90')} />
        </button>
        {open && (
          <div>
            {groupTasks.map((t) => (
              <TaskRow key={t.id} task={t} tone={tone === 'danger' ? 'danger' : tone === 'success' ? 'done' : 'default'} />
            ))}
          </div>
        )}
      </motion.section>
    )
  }

  // Which groups to show under the active quick filter
  const showGroup = (key: GroupKey): boolean => {
    if (!quickFilter) return key !== 'completed' || completedOpen
    if (quickFilter === 'overdue') return key === 'overdue'
    if (quickFilter === 'today') return key === 'today'
    if (quickFilter === 'week') return ['overdue', 'today', 'tomorrow', 'week'].includes(key)
    if (quickFilter === 'done') return key === 'completed'
    return true
  }

  const noOpenTasks = counts.openTotal === 0
  const nothingVisible = quickFilter
    ? (quickFilter === 'done' ? groups.completed.length === 0 : !(['overdue', 'today', 'tomorrow', 'week', 'later'] as GroupKey[]).some((k) => showGroup(k) && groups[k].length > 0))
    : noOpenTasks && groups.completed.length === 0

  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-6xl">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-heading font-semibold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">
              {counts.overdue > 0
                ? <><span className="text-chart-3 font-medium">{counts.overdue} overdue</span> · {counts.today} due today · {counts.doneToday} done today</>
                : counts.today > 0
                  ? <>{counts.today} due today · {counts.doneToday} done today</>
                  : noOpenTasks
                    ? 'All clear — nothing on your plate'
                    : `${counts.openTotal} open · ${counts.doneToday} done today`}
            </p>
          </div>

          {/* Summary tiles — clickable quick filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {([
              { key: 'overdue' as const, label: 'Overdue', value: counts.overdue, icon: Flame, danger: true },
              { key: 'today' as const, label: 'Due today', value: counts.today, icon: Sun, danger: false },
              { key: 'week' as const, label: 'This week', value: counts.week, icon: CalendarDays, danger: false },
              { key: 'done' as const, label: 'Done today', value: counts.doneToday, icon: CheckCircle, danger: false },
            ]).map((tile) => (
              <button
                key={tile.key}
                onClick={() => setQuickFilter(quickFilter === tile.key ? null : tile.key)}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all hover:shadow-sm',
                  quickFilter === tile.key
                    ? tile.danger ? 'border-chart-3 bg-chart-3/5' : 'border-primary bg-primary/5'
                    : 'bg-card hover:bg-muted/30',
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tile.icon className={cn('w-3.5 h-3.5', tile.danger && counts.overdue > 0 && 'text-chart-3')} />
                  {tile.label}
                </span>
                <span className={cn(
                  'block text-3xl font-heading font-semibold mt-1 font-mono tabular-nums',
                  tile.danger && counts.overdue > 0 && 'text-chart-3',
                )}>
                  {tile.value}
                </span>
              </button>
            ))}
          </div>

          {/* Quick-add command bar */}
          <div className="mb-4 p-4 rounded-xl border bg-card shadow-sm">
            <div className="flex items-center gap-3">
              {!filterClient && clients.length > 1 && (
                <ClientCombobox
                  clients={clients.map((c) => ({ id: c.id, name: c.name, health_status: c.health_status, state: c.state }))}
                  value={quickClient || null}
                  onChange={(v) => setQuickClient(v ?? '')}
                  placeholder="Assign to client…"
                  ariaLabel="Assign this task to a client"
                  required
                />
              )}
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitQuickAdd() }}
                placeholder={
                  effectiveClient
                    ? `New task for ${clients.find((c) => c.id === effectiveClient)?.name ?? 'this client'}…`
                    : 'Pick a client, then type a task…'
                }
                className="flex-1 min-w-[200px]"
                disabled={!effectiveClient}
              />
              {teamMembers.length > 0 && (
                <Select value={quickAssigneeId ?? ''} onValueChange={(v) => setQuickAssigneeId(v || null)}>
                  <SelectTrigger className="w-[150px]" aria-label="Assign to team member"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={submitQuickAdd} disabled={saving || !quickTitle.trim() || !effectiveClient}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Enter to save · Due {filterDue ? format(parseISO(filterDue), 'MMM d, yyyy') : format(today, 'MMM d')}
              {effectiveClient && (
                <>
                  {' · '}for{' '}
                  <a href={`/clients/${effectiveClient}`} className="text-primary hover:underline">
                    {clients.find((c) => c.id === effectiveClient)?.name ?? 'client'}
                  </a>
                </>
              )}
            </p>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select value={filterClient || 'any'} onValueChange={(v) => setParams({ client: v === 'any' ? null : v })}>
              <SelectTrigger className="w-[170px]" aria-label="Filter by client"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All Clients</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {teamMembers.length > 0 && (
              <Select value={filterAssignee || 'any'} onValueChange={(v) => setParams({ assignee: v === 'any' ? null : v })}>
                <SelectTrigger className="w-[160px]" aria-label="Filter by assignee"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Anyone</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {filterDue && (
              <span className="flex items-center gap-1.5 text-sm bg-muted rounded-md px-2.5 py-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                {format(parseISO(filterDue), 'MMM d, yyyy')}
                <button onClick={() => setParams({ due: null })} className="hover:text-foreground" aria-label="Clear date filter"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}

            {quickFilter && (
              <span className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary rounded-md px-2.5 py-1.5">
                Showing: {{ overdue: 'Overdue', today: 'Due today', week: 'This week', done: 'Completed' }[quickFilter]}
                <button onClick={() => setQuickFilter(null)} className="hover:text-primary/70" aria-label="Clear quick filter"><X className="w-3.5 h-3.5" /></button>
              </span>
            )}

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { router.replace('/tasks'); setQuickFilter(null) }}>
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}

            <Button variant="ghost" size="sm" className="gap-1.5 ml-auto lg:hidden" onClick={() => setShowCalendar(!showCalendar)}>
              <CalendarIcon className="w-4 h-4" />
              {showCalendar ? 'Hide calendar' : 'Show calendar'}
            </Button>
          </div>

          {/* Main layout: list + right rail */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* Grouped list */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="rounded-xl border bg-card p-4 space-y-3" aria-label="Loading tasks">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-md bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ) : nothingVisible ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                  {hasFilters || quickFilter ? (
                    <>
                      <p className="text-muted-foreground mb-4">No tasks match these filters.</p>
                      <Button variant="outline" onClick={() => { router.replace('/tasks'); setQuickFilter(null) }}>Clear filters</Button>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-10 h-10 text-chart-5 mx-auto mb-3" />
                      <p className="font-medium mb-1">All clear</p>
                      <p className="text-sm text-muted-foreground">Nothing on your plate. Add a task above to keep cases moving.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {showGroup('overdue') && <TaskGroup title="Overdue" icon={Flame} tasks={groups.overdue} tone="danger" delay={0} />}
                  {showGroup('today') && <TaskGroup title="Today" icon={Sun} tasks={groups.today} tone="primary" delay={0.05} />}
                  {showGroup('tomorrow') && <TaskGroup title="Tomorrow" icon={CalendarDays} tasks={groups.tomorrow} delay={0.1} />}
                  {showGroup('week') && <TaskGroup title="This week" icon={CalendarDays} tasks={groups.week} delay={0.15} />}
                  {showGroup('later') && <TaskGroup title="Later" icon={CalendarDays} tasks={groups.later} delay={0.2} />}

                  {/* Completed — collapsible */}
                  {groups.completed.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                      className="rounded-xl border bg-card overflow-hidden"
                    >
                      <button
                        onClick={() => setCompletedOpen(!completedOpen)}
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4 text-chart-5" />
                        <span className="font-semibold text-sm">Completed</span>
                        <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {groups.completed.length}
                        </span>
                        <ChevronDown className={cn('w-4 h-4 ml-auto text-muted-foreground transition-transform', !completedOpen && '-rotate-90')} />
                      </button>
                      {completedOpen && (
                        <div>
                          {groups.completed.slice(0, 25).map((t) => (
                            <TaskRow key={t.id} task={t} tone="done" />
                          ))}
                          {groups.completed.length > 25 && (
                            <p className="px-4 py-3 text-xs text-muted-foreground border-t">
                              Showing 25 most recent · {groups.completed.length - 25} older hidden
                            </p>
                          )}
                        </div>
                      )}
                    </motion.section>
                  )}
                </>
              )}
            </div>

            {/* Right rail: calendar (toggle hides it below lg) */}
            <div className={cn('lg:sticky lg:top-6', !showCalendar && 'hidden lg:block')}>
              <div className="p-4 rounded-xl border bg-card">
                <Calendar
                  mode="single"
                  selected={filterDue ? parseISO(filterDue) : undefined}
                  onSelect={(day) => setParams({ due: day ? format(day, 'yyyy-MM-dd') : null })}
                  modifiers={{ hasTasks: daysWithTasks, hasOverdue: daysWithOverdue }}
                  modifiersClassNames={{
                    hasTasks: 'rdp-day_hasTasks',
                    hasOverdue: 'rdp-day_overdue',
                  }}
                />
                <div className="flex items-center gap-4 px-2 pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> tasks due</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> overdue</span>
                </div>
                {selectedTask && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedTask.title}</span>
                    <span className="block mt-0.5">Due {format(parseISO(selectedTask.due_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-background">
        <NavRail />
        <main className="flex-1 ml-16 p-8">
          <div className="container mx-auto px-4 py-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-muted/60 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  )
}
