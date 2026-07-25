'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import {
  Calendar as CalendarIcon, CheckCircle, ChevronDown, ChevronRight,
  Plus, Trash2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NavRail } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { fetchClients, fetchTasks, invalidateAfterMutation } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import { createTask, setTaskCompleted, updateTask, deleteTask } from '@/lib/data/mutations'
import { taskStatus } from '@/lib/data/domain'
import type { TaskWithClient } from '@/lib/data/types'
import { cn } from '@/lib/utils'

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

  const filterClient = searchParams.get('client') ?? ''
  const filterStatus = searchParams.get('status') ?? ''
  const filterDue = searchParams.get('due') ?? ''
  const view = searchParams.get('view') === 'all' ? 'all' : 'focus'

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`/tasks?${params.toString()}`, { scroll: false })
  }

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const today = startOfDay(new Date())
  const visible = useMemo(() => {
    return tasks.filter((t) => {
      const status = taskStatus(t, today)
      if (filterClient && t.client_id !== filterClient) return false
      if (filterStatus && status !== filterStatus) return false
      if (filterDue) {
        if (t.due_date !== filterDue) return false
      } else if (!filterStatus && view === 'focus') {
        if (status === 'completed') return false
        if (startOfDay(parseISO(t.due_date)) > today) return false
      }
      return true
    })
  }, [tasks, filterClient, filterStatus, filterDue, view, today])

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
  const counts = useMemo(() => ({
    overdue: tasks.filter((t) => taskStatus(t, today) === 'overdue').length,
    today: tasks.filter((t) => !t.completed_at && isSameDay(parseISO(t.due_date), today)).length,
  }), [tasks, today])

  const [quickTitle, setQuickTitle] = useState('')
  const [quickClient, setQuickClient] = useState('')
  const [saving, setSaving] = useState(false)

  const effectiveClient = filterClient || quickClient || (clients.length === 1 ? clients[0].id : '')

  const submitQuickAdd = async () => {
    const dueDate = filterDue || format(today, 'yyyy-MM-dd')
    if (!quickTitle.trim() || !effectiveClient || saving) return
    setSaving(true)
    try {
      await createTask({ client_id: effectiveClient, title: quickTitle.trim(), due_date: dueDate })
      await invalidateAfterMutation(queryClient, effectiveClient)
      setQuickTitle('')
      toast.success('Task created')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create this task. Try again.")
    } finally {
      setSaving(false)
    }
  }

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

  const hasFilters = !!(filterClient || filterStatus || filterDue)

  const formatDue = (dateStr: string) => {
    const d = startOfDay(parseISO(dateStr))
    if (isSameDay(d, today)) return 'Today'
    const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    return format(d, 'MMM d')
  }

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-heading font-semibold tracking-tight">Tasks</h1>
              <p className="text-muted-foreground mt-1">
                {counts.overdue > 0
                  ? <><span className="text-red-600 font-medium">{counts.overdue} overdue</span> · {counts.today} due today</>
                  : counts.today > 0
                    ? <>{counts.today} due today</>
                    : 'All cases on track — nothing overdue'}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5 w-fit" onClick={() => setShowCalendar(!showCalendar)}>
              <CalendarIcon className="w-4 h-4" />
              {showCalendar ? 'Hide calendar' : 'Show calendar'}
            </Button>
          </div>

          {/* Calendar — collapsed by default */}
          {showCalendar && (
            <div className="mb-6 p-4 rounded-lg border bg-card">
              <Calendar
                mode="single"
                selected={filterDue ? parseISO(filterDue) : undefined}
                onSelect={(day) => setParams({ due: day ? format(day, 'yyyy-MM-dd') : null, status: null, view: null })}
                modifiers={{ hasTasks: daysWithTasks, hasOverdue: daysWithOverdue }}
                modifiersClassNames={{ hasTasks: 'aurora-day-tasks', hasOverdue: 'aurora-day-overdue' }}
              />
              <div className="flex items-center gap-4 px-2 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> tasks due</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> overdue</span>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div className="mb-4 p-4 rounded-lg border bg-card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-md border overflow-hidden text-sm">
                <button
                  onClick={() => setParams({ view: null, status: null, due: null })}
                  className={cn('px-3 py-1.5 font-medium transition-colors', view === 'focus' && !filterStatus && !filterDue ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  Today
                </button>
                <button
                  onClick={() => setParams({ view: 'all', status: null, due: null })}
                  className={cn('px-3 py-1.5 font-medium transition-colors', view === 'all' || filterStatus || filterDue ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  All
                </button>
              </div>

              <Select value={filterStatus || 'any'} onValueChange={(v) => setParams({ status: v === 'any' ? null : v })}>
                <SelectTrigger className="w-[130px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All Status</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterClient || 'any'} onValueChange={(v) => setParams({ client: v === 'any' ? null : v })}>
                <SelectTrigger className="w-[160px]" aria-label="Filter by client"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All Clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {filterDue && (
                <span className="flex items-center gap-1.5 text-sm bg-muted rounded-md px-2.5 py-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {format(parseISO(filterDue), 'MMM d, yyyy')}
                  <button onClick={() => setParams({ due: null })} className="hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => router.replace('/tasks')}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Quick-add */}
          <div className="mb-4 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              {!filterClient && clients.length > 1 && (
                <Select value={quickClient} onValueChange={(v) => setQuickClient(v ?? '')}>
                  <SelectTrigger className="w-[160px]" aria-label="Task client"><SelectValue placeholder="Client…" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitQuickAdd() }}
                placeholder="New task — press Enter to add"
                className="flex-1 min-w-[200px]"
              />
              <Button
                onClick={submitQuickAdd}
                disabled={saving || !quickTitle.trim() || !effectiveClient}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Task list */}
          {isLoading ? (
            <div className="rounded-lg border bg-card p-4 space-y-3" aria-label="Loading tasks">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-md bg-muted/60 animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center">
              {hasFilters ? (
                <>
                  <p className="text-muted-foreground mb-4">No tasks match these filters.</p>
                  <Button variant="outline" onClick={() => router.replace('/tasks')}>Clear filters</Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">
                    {view === 'focus' ? 'Nothing due today.' : 'No tasks yet.'}
                  </p>
                  {view === 'focus' && (
                    <Button variant="outline" onClick={() => setParams({ view: 'all' })}>View all tasks</Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8" />
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Task</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">Due</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((task) => {
                    const status = taskStatus(task, today)
                    const expanded = selectedId === task.id
                    const overdue = status === 'overdue'
                    const completed = status === 'completed'
                    const dueToday = isSameDay(parseISO(task.due_date), today)

                    return (
                      <tr key={task.id} className={cn(completed && 'opacity-50')}>
                        <td className="px-4 py-2.5 align-middle">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleComplete(task) }}
                            aria-label={completed ? 'Reopen task' : 'Complete task'}
                          >
                            {completed
                              ? <CheckCircle className="w-4 h-4 text-green-600" />
                              : <span className="block w-4 h-4 rounded-full border-[1.5px] border-muted-foreground/40 hover:border-primary transition-colors" />}
                          </button>
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors',
                            expanded && 'bg-muted/40'
                          )}
                          onClick={() => setSelectedId(expanded ? null : task.id)}
                        >
                          <span className={cn('font-medium block truncate', completed && 'line-through text-muted-foreground')}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="text-xs text-muted-foreground block truncate mt-0.5">{task.description}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/clients/${task.client_id}#tasks`) }}
                            className="text-muted-foreground hover:text-primary hover:underline text-xs"
                          >
                            {task.clients?.name ?? '—'}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={cn(
                            'text-xs font-mono tabular-nums',
                            overdue && 'text-red-600 font-semibold',
                            dueToday && !completed && 'text-amber-600 font-medium',
                            completed && 'text-muted-foreground'
                          )}>
                            {formatDue(task.due_date)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(expanded ? null : task.id) }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            {expanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Expanded detail — outside the table for full-width */}
              {selectedTask && (() => {
                const status = taskStatus(selectedTask, today)
                const completed = status === 'completed'
                return (
                  <div className="border-t bg-muted/20 px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <h3 className="font-semibold">{selectedTask.title}</h3>
                        {selectedTask.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{selectedTask.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created {format(parseISO(selectedTask.created_at), 'MMM d, yyyy')}</span>
                          {selectedTask.due_time && <span className="font-mono">{selectedTask.due_time.slice(0, 5)}</span>}
                          {selectedTask.completed_at && <span>Done {format(parseISO(selectedTask.completed_at), 'MMM d, yyyy')}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={completed ? 'outline' : 'default'}
                          onClick={() => toggleComplete(selectedTask)}
                        >
                          {completed ? 'Reopen' : 'Mark done'}
                        </Button>
                        <input
                          type="date"
                          defaultValue={selectedTask.due_date}
                          onChange={(e) => reschedule(selectedTask, e.target.value)}
                          className="h-7 text-xs border border-input rounded-md px-2 bg-background text-foreground"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => removeTask(selectedTask)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/clients/${selectedTask.client_id}#tasks`)}
                      className="text-xs text-primary hover:underline mt-3 inline-block"
                    >
                      Open case →
                    </button>
                  </div>
                )
              })()}
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-2 px-1">
            {visible.length} task{visible.length !== 1 ? 's' : ''} · click a row to expand
          </p>
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
