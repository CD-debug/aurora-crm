'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, parseISO, startOfDay, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon, CheckCircle, ChevronDown, ChevronLeft, ChevronRight,
  ExternalLink, Flame, Plus, Sun, Trash2, User, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const [calMonth, setCalMonth] = useState(() => startOfMonth(new Date()))

  const calGrid = useMemo<(Date | null)[]>(() => {
    const first = startOfMonth(calMonth)
    const last = endOfMonth(calMonth)
    const allDays = eachDayOfInterval({ start: first, end: last })
    const leadBlanks = getDay(first) // 0=Sun
    const cells: (Date | null)[] = []
    for (let i = 0; i < leadBlanks; i++) cells.push(null)
    cells.push(...allDays)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calMonth])

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
    if (task.completed_at) return null
    const diff = differenceInCalendarDays(parseISO(task.due_date), today)
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
      <div className={cn('group', expanded && 'bg-muted/40')}>
        <div className="flex items-start gap-3 px-4 sm:px-5 py-3.5 hover:bg-muted/40 transition-colors">
          {/* Checkbox */}
          <button
            onClick={() => toggleComplete(task)}
            className="flex-shrink-0 mt-0.5"
            aria-label={completed ? 'Reopen task' : 'Complete task'}
          >
            {completed
              ? <CheckCircle className="w-5 h-5 text-chart-5" />
              : <span className={cn(
                  'block w-5 h-5 rounded-full border-2 transition-all',
                  tone === 'danger'
                    ? 'border-chart-3/50 hover:border-chart-3 hover:bg-chart-3/10'
                    : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/10',
                )} />}
          </button>

          {/* Title + meta */}
          <button
            onClick={() => setSelectedId(expanded ? null : task.id)}
            className="flex-1 min-w-0 text-left"
          >
            <span className={cn('text-[15px] leading-snug block', completed ? 'line-through text-muted-foreground' : 'font-medium')}>
              {task.title}
            </span>
            <span className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span
                role="link"
                onClick={(e) => { e.stopPropagation(); router.push(`/clients/${task.client_id}#tasks`) }}
                className="hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
              >
                {task.clients?.name ?? '—'}
              </span>
              {assignee && (
                <>
                  <span className="text-border">·</span>
                  <span className="inline-flex items-center gap-1" title={`Assigned to ${assignee}`}>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                      {assigneeInitials}
                    </span>
                    {assignee}
                  </span>
                </>
              )}
            </span>
          </button>

          {/* Due label + actions */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {due && (
              <span className={cn(
                'text-xs font-mono tabular-nums mr-1',
                due.tone === 'danger' && 'text-chart-3 font-semibold',
                due.tone === 'primary' && 'text-primary font-medium',
                due.tone === 'default' && 'text-muted-foreground',
              )}>
                {due.text}
              </span>
            )}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
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
              <div className="px-5 pb-4 pl-[52px] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border-b border-border/50">
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

  function GroupSection({
    label, tasks: groupTasks, tone = 'default', collapsible = false, open, onToggle,
  }: {
    label: string
    tasks: TaskWithClient[]
    tone?: 'danger' | 'primary' | 'success' | 'default'
    collapsible?: boolean
    open?: boolean
    onToggle?: () => void
  }) {
    if (groupTasks.length === 0) return null
    const isOpen = collapsible ? open : true
    return (
      <section>
        <button
          onClick={collapsible ? onToggle : undefined}
          className={cn(
            'w-full flex items-center gap-2 px-5 py-3.5 text-left',
            collapsible && 'hover:bg-muted/50 transition-colors rounded-t-lg',
          )}
        >
          {tone === 'danger' && <Flame className="w-4 h-4 text-chart-3 flex-shrink-0" />}
          {tone === 'primary' && <Sun className="w-4 h-4 text-primary flex-shrink-0" />}
          {tone === 'success' && <CheckCircle className="w-4 h-4 text-chart-5 flex-shrink-0" />}
          <span className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            tone === 'danger' && 'text-chart-3',
            tone === 'primary' && 'text-primary',
            tone === 'success' && 'text-chart-5',
            tone === 'default' && 'text-muted-foreground',
          )}>
            {label}
          </span>
          <span className="text-xs font-mono tabular-nums text-muted-foreground/70">
            {groupTasks.length}
          </span>
          {collapsible && (
            <ChevronDown className={cn('w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform', !isOpen && '-rotate-90')} />
          )}
        </button>
        {isOpen && (
          <div className="divide-y divide-border/50">
            {groupTasks.map((t) => (
              <TaskRow key={t.id} task={t} tone={tone === 'danger' ? 'danger' : tone === 'success' ? 'done' : 'default'} />
            ))}
          </div>
        )}
      </section>
    )
  }

  const showGroup = (key: GroupKey): boolean => {
    if (!quickFilter) return true
    if (quickFilter === 'overdue') return key === 'overdue'
    if (quickFilter === 'today') return key === 'today'
    if (quickFilter === 'week') return ['overdue', 'today', 'tomorrow', 'week'].includes(key)
    if (quickFilter === 'done') return key === 'completed'
    return true
  }

  const noOpenTasks = counts.openTotal === 0
  const visibleOpenCount =
    (showGroup('overdue') ? groups.overdue.length : 0) +
    (showGroup('today') ? groups.today.length : 0) +
    (showGroup('tomorrow') ? groups.tomorrow.length : 0) +
    (showGroup('week') ? groups.week.length : 0) +
    (showGroup('later') ? groups.later.length : 0)
  const nothingVisible = visibleOpenCount === 0 && (quickFilter === 'done' ? groups.completed.length === 0 : true)

  const statButton = (
    key: Exclude<QuickFilter, null>,
    label: string,
    value: number,
    opts?: { danger?: boolean }
  ) => (
    <button
      onClick={() => setQuickFilter(quickFilter === key ? null : key)}
      className={cn(
        'group relative flex flex-col items-start gap-1 px-4 py-3 rounded-xl transition-all min-w-[120px]',
        'border',
        quickFilter === key
          ? (opts?.danger ? 'bg-chart-3/5 border-chart-3/30 shadow-sm' : 'bg-primary/5 border-primary/30 shadow-sm')
          : 'bg-card border-border hover:border-foreground/20 hover:shadow-sm',
      )}
    >
      {quickFilter === key && (
        <span className={cn(
          'absolute left-0 top-3 bottom-3 w-0.5 rounded-r',
          opts?.danger ? 'bg-chart-3' : 'bg-primary',
        )} />
      )}
      <span className={cn(
        'text-3xl font-heading font-semibold tabular-nums leading-none tracking-tight',
        opts?.danger && value > 0 && quickFilter !== key ? 'text-chart-3' : 'text-foreground',
      )}>
        {value}
      </span>
      <span className={cn(
        'text-[11px] font-medium uppercase tracking-wider',
        quickFilter === key ? 'text-foreground/80' : 'text-muted-foreground',
      )}>
        {label}
      </span>
    </button>
  )

  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

          {/* Header + stat strip */}
          <div className="flex flex-col gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-semibold tracking-tight">Tasks</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {noOpenTasks
                  ? 'All clear — nothing on your plate'
                  : `${counts.openTotal} open across ${clients.length} client${clients.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <div className="flex flex-wrap items-stretch gap-3">
              {statButton('overdue', 'Overdue', counts.overdue, { danger: true })}
              {statButton('today', 'Today', counts.today)}
              {statButton('week', 'This week', counts.week)}
              {statButton('done', 'Done today', counts.doneToday)}
            </div>
          </div>

          {/* Quick-add */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 mb-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {!filterClient && clients.length > 1 && (
                <ClientCombobox
                  clients={clients.map((c) => ({ id: c.id, name: c.name, health_status: c.health_status, state: c.state }))}
                  value={quickClient || null}
                  onChange={(v) => setQuickClient(v ?? '')}
                  placeholder="Client…"
                  ariaLabel="Assign this task to a client"
                  required
                  className="w-[200px] shrink-0"
                />
              )}
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitQuickAdd() }}
                placeholder={
                  effectiveClient
                    ? `Add a task for ${clients.find((c) => c.id === effectiveClient)?.name ?? 'this client'}…`
                    : 'Pick a client, then type a task…'
                }
                className="flex-1 min-w-[200px] h-11"
                disabled={!effectiveClient}
              />
              {teamMembers.length > 0 && (
                <Select value={quickAssigneeId ?? ''} onValueChange={(v) => setQuickAssigneeId(v || null)}>
                  <SelectTrigger className="w-[160px] h-11" aria-label="Assign to team member"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={submitQuickAdd} disabled={saving || !quickTitle.trim() || !effectiveClient} className="w-auto min-w-[120px] h-11 shadow-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Add task
              </Button>
            </div>
            <p className="mt-3 px-0.5 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>Enter to save</span>
              <span className="text-border mx-0.5">·</span>
              <span>Due {filterDue ? format(parseISO(filterDue), 'MMM d, yyyy') : format(today, 'MMM d')}</span>
              {effectiveClient && (
                <>
                  <span className="text-border mx-0.5">·</span>
                  <span>for</span>
                  <a href={`/clients/${effectiveClient}`} className="text-primary hover:underline">
                    {clients.find((c) => c.id === effectiveClient)?.name ?? 'client'}
                  </a>
                </>
              )}
            </p>
          </div>

{/* Filter row — clean, aligned, consistent heights */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select value={filterClient || 'any'} onValueChange={(v) => setParams({ client: v === 'any' ? null : v })}>
              <SelectTrigger className="w-[180px] h-10" aria-label="Filter by client"><SelectValue placeholder="All clients" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All clients</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {teamMembers.length > 0 && (
              <Select value={filterAssignee || 'any'} onValueChange={(v) => setParams({ assignee: v === 'any' ? null : v })}>
                <SelectTrigger className="w-[160px] h-10" aria-label="Filter by assignee"><SelectValue placeholder="Anyone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Anyone</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {filterDue && (
              <span className="inline-flex items-center gap-1.5 text-sm bg-muted/50 rounded-lg px-3 py-1.5 h-10">
                <CalendarIcon className="w-4 h-4" />
                {format(parseISO(filterDue), 'MMM d, yyyy')}
                <button onClick={() => setParams({ due: null })} className="hover:text-foreground" aria-label="Clear date filter"><X className="w-4 h-4" /></button>
              </span>
            )}

            {(hasFilters || quickFilter) && (
              <Button variant="outline" size="sm" className="h-10 gap-1.5" onClick={() => { router.replace('/tasks'); setQuickFilter(null) }}>
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}

            <Button variant="outline" size="sm" className="gap-1.5 ml-auto lg:hidden h-10" onClick={() => setShowCalendar(!showCalendar)}>
              <CalendarIcon className="w-4 h-4" />
              {showCalendar ? 'Hide calendar' : 'Show calendar'}
            </Button>
          </div>

          {/* Main layout: list + right rail */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

            {/* Unified list */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-sm"
            >
              {isLoading ? (
                <div className="p-5 space-y-3" aria-label="Loading tasks">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-md bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ) : nothingVisible ? (
                <div className="p-14 text-center">
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
                <div>
                  {showGroup('overdue') && <GroupSection label="Overdue" tasks={groups.overdue} tone="danger" />}
                  {showGroup('today') && <GroupSection label="Today" tasks={groups.today} tone="primary" />}
                  {showGroup('tomorrow') && <GroupSection label="Tomorrow" tasks={groups.tomorrow} />}
                  {showGroup('week') && <GroupSection label="This week" tasks={groups.week} />}
                  {showGroup('later') && <GroupSection label="Later" tasks={groups.later} />}
                  {showGroup('completed') && groups.completed.length > 0 && (
                    <GroupSection
                      label="Completed"
                      tasks={completedOpen ? groups.completed.slice(0, 25) : groups.completed}
                      tone="success"
                      collapsible
                      open={completedOpen}
                      onToggle={() => setCompletedOpen(!completedOpen)}
                    />
                  )}
                  {completedOpen && groups.completed.length > 25 && (
                    <p className="px-5 py-3 text-xs text-muted-foreground border-t border-border/50">
                      Showing 25 most recent · {groups.completed.length - 25} older hidden
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Right rail: frameless task heatmap (custom, no white box) */}
            <div className={cn('lg:sticky lg:top-6 space-y-6', !showCalendar && 'hidden lg:block')}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-sm font-semibold tracking-tight">
                    {format(calMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCalMonth((m) => addDays(startOfMonth(m), -1))}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCalMonth(startOfMonth(new Date()))}
                      className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setCalMonth((m) => addDays(endOfMonth(m), 1))}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-y-1 text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider mb-2">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calGrid.map((day, idx) => {
                    if (!day) return <div key={idx} />
                    const isToday = isSameDay(day, today)
                    const isSelected = filterDue && isSameDay(day, parseISO(filterDue))
                    const hasTasks = daysWithTasks.some((d) => isSameDay(d, day))
                    const hasOverdue = daysWithOverdue.some((d) => isSameDay(d, day))
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setParams({ due: isSelected ? null : format(day, 'yyyy-MM-dd') })}
                        title={format(day, 'MMM d, yyyy')}
                        className={cn(
                          'group relative aspect-square flex flex-col items-center justify-center rounded-md transition-all',
                          'hover:bg-muted/70',
                          isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                          !isSelected && isToday && 'ring-1 ring-primary/60 ring-inset',
                        )}
                      >
                        <span className={cn(
                          'text-xs leading-none',
                          !isSelected && isToday && 'font-semibold text-primary',
                          !isSelected && !isToday && 'text-foreground/80',
                        )}>
                          {format(day, 'd')}
                        </span>
                        {(hasTasks || hasOverdue) && (
                          <span className={cn(
                            'mt-0.5 w-1 h-1 rounded-full',
                            isSelected ? 'bg-primary-foreground' : hasOverdue ? 'bg-red-500' : 'bg-primary',
                          )} />
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 pt-3 mt-3 text-[11px] text-muted-foreground/80">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> tasks due</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> overdue</span>
                </div>
              </div>
              {selectedTask && (
                <div className="p-4 rounded-2xl border border-border/60 bg-card shadow-sm">
                  <p className="font-heading text-sm font-semibold tracking-tight">{selectedTask.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Due {format(parseISO(selectedTask.due_date), 'MMM d, yyyy')}
                    {selectedTask.clients?.name && (
                      <> · {selectedTask.clients.name}</>
                    )}
                  </p>
                  <button
                    onClick={() => router.push(`/clients/${selectedTask.client_id}#tasks`)}
                    className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open case <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
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
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
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
