'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { NavRail } from '@/components/shared/NavRail'
import { Toaster } from '@/components/shared/toaster'
import { PageHeader } from '@/components/shared/PageHeader'
import { TaskStatusBadge } from '@/components/shared/badges'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInDays, isBefore, startOfDay, parseISO } from 'date-fns'
import { 
  Calendar, ChevronDown, ChevronUp, Search, Filter, X, 
  Plus, MoreHorizontal, Check, Clock, User, AlertTriangle, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { toast } from 'sonner'

interface Task {
  id: string
  client_id: string
  title: string
  description: string | null
  due_date: string
  due_time: string | null
  status: 'pending' | 'completed' | 'overdue'
  completed_at: string | null
  created_at: string
  clients?: { name: string; state: string; health_status: string }
}

interface Client {
  id: string
  name: string
}

const STATUS_LABELS = {
  pending: 'Upcoming',
  overdue: 'Overdue',
  completed: 'Completed',
} as const

function TasksPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'due_date', direction: 'asc' })
  
  const filters = {
    clientId: searchParams.get('client') || '',
    status: searchParams.get('status') || '',
    dueDate: searchParams.get('dueDate') || '',
    view: searchParams.get('view') || 'today-overdue',
  }

  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    client_id: '', title: '', description: '', due_date: '', due_time: ''
  })
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [filters.clientId, filters.status, filters.dueDate, filters.view])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.clientId) params.set('clientId', filters.clientId)
      if (filters.status) params.set('status', filters.status)
      if (filters.dueDate) params.set('dueDate', filters.dueDate)
      if (filters.view === 'today-overdue') {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
        params.set('dueDateFrom', '2020-01-01')
        params.set('dueDateTo', today)
      }
      params.set('sort', sortConfig.key)
      params.set('direction', sortConfig.direction)
      
      const [tasksRes, clientsRes] = await Promise.all([
        fetch(`/api/tasks?${params.toString()}`),
        fetch('/api/clients?sort=name&direction=asc')
      ])
      
      if (tasksRes.ok) setTasks((await tasksRes.json()).tasks || [])
      if (clientsRes.ok) setClients((await clientsRes.json()).clients || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/tasks?${params.toString()}`)
  }

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      })
      if (res.ok) {
        setAddTaskOpen(false)
        setNewTask({ client_id: '', title: '', description: '', due_date: '', due_time: '' })
        toast.success('Task created')
        fetchData()
      } else {
        toast.error('Failed to create task')
      }
    } catch {
      toast.error('Failed to create task')
    }
  }

  const handleCompleteTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() })
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t))
        toast.success('Task completed')
      } else {
        toast.error('Failed to complete task')
      }
    } catch {
      toast.error('Failed to complete task')
    }
  }

  const handleTaskStatusChange = async (task: Task, status: Task['status']) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status, completed_at: status === 'completed' ? new Date().toISOString() : t.completed_at } : t))
        toast.success(`Task marked as ${STATUS_LABELS[status]}`)
      } else {
        toast.error('Failed to update task')
      }
    } catch {
      toast.error('Failed to update task')
    }
  }

  const today = startOfDay(new Date())
  
  const getTaskStatus = (task: Task): Task['status'] => {
    if (task.status === 'completed') return 'completed'
    const dueDate = startOfDay(parseISO(task.due_date))
    return isBefore(dueDate, today) ? 'overdue' : 'pending'
  }

  const displayTasks = tasks.map(t => ({ ...t, status: getTaskStatus(t) }))

  const sortedTasks = [...displayTasks].sort((a, b) => {
    const aVal = a[sortConfig.key as keyof Task]
    const bVal = b[sortConfig.key as keyof Task]
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const getStatusColor = (status: Task['status']) => {
    if (status === 'overdue') return 'bg-red-100 text-red-800 border-red-200'
    if (status === 'completed') return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto transition-all duration-200 lg:ml-64">
        <Toaster />
        
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <PageHeader
            title="Tasks"
            subtitle="Manage follow-ups and appointments across all cases"
            action={
              <Sheet open={addTaskOpen} onOpenChange={setAddTaskOpen}>
                <SheetTrigger><Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-md">
                  <SheetHeader>
                    <SheetTitle>Create New Task</SheetTitle>
                    <SheetDescription>Schedule a follow-up or action item</SheetDescription>
                  </SheetHeader>
                  <form onSubmit={handleAddTask} className="space-y-4 p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client *</label>
                      <Select value={newTask.client_id || ''} onValueChange={v => setNewTask({...newTask, client_id: v || ''})}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Select client</SelectItem>
                          {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title *</label>
                      <Input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Due Date *</label>
                        <Input type="date" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} required min={format(today, 'yyyy-MM-dd')} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Due Time</label>
                        <Input type="time" value={newTask.due_time} onChange={e => setNewTask({...newTask, due_time: e.target.value})} />
                      </div>
                    </div>
                    <SheetFooter>
                      <Button type="submit" className="w-full">Create Task</Button>
                    </SheetFooter>
                  </form>
                </SheetContent>
              </Sheet>
            }
          />
          
          {/* Filters */}
          <div className="mb-4 p-4 rounded-lg border bg-card sticky top-0 z-10 bg-background/95 backdrop-blur">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter tasks..."
                  value={filters.clientId ? '' : ''}
                  onChange={e => {
                    // Client filter handled by select
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={filters.clientId} onValueChange={v => handleFilterChange('client', v || '')}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="pending">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger><Button variant="outline" className="whitespace-nowrap">
                    <Calendar className="w-4 h-4 mr-2" />
                    Due Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <Input type="date" value={filters.dueDate} onChange={e => handleFilterChange('dueDate', e.target.value)} />
                </PopoverContent>
              </Popover>
              <Select value={filters.view} onValueChange={v => handleFilterChange('view', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="View" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today-overdue">Today + Overdue</SelectItem>
                  <SelectItem value="all">All Upcoming</SelectItem>
                </SelectContent>
              </Select>
              {(filters.clientId || filters.status || filters.dueDate || filters.view !== 'today-overdue') && (
                <Button variant="ghost" size="sm" onClick={() => router.push('/tasks')}>
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Task Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>
            ) : sortedTasks.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  {filters.view === 'today-overdue' 
                    ? 'Nothing due today. Add a task to keep cases moving.' 
                    : 'No tasks found matching your filters.'}
                </p>
                <Button onClick={() => setAddTaskOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('due_date')}>
                        <div className="flex items-center gap-1">
                          Due Date
                          {sortConfig.key === 'due_date' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('due_time')}>Time</TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort('clients.name')}>
                        <div className="flex items-center gap-1">
                          Client
                          {sortConfig.key === 'clients.name' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                        </div>
                      </TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTasks.map((task) => {
                      const status = getTaskStatus(task)
                      const isExpanded = expandedTaskId === task.id
                      
                      return (
                        <>
                          <TableRow 
                            key={task.id} 
                            className={cn(
                              'cursor-pointer transition-colors',
                              isExpanded && 'bg-accent/50',
                              status === 'overdue' && 'bg-red-50',
                              status === 'completed' && 'opacity-60'
                            )}
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          >
                            <TableCell className="font-mono font-medium">
                              {format(parseISO(task.due_date), 'MMM d, yyyy')}
                              {status === 'overdue' && (
                                <AlertTriangle className="w-3 h-3 text-red-500 ml-1 inline" />
                              )}
                            </TableCell>
                            <TableCell>
                              {task.due_time ? format(parseISO(`2000-01-01T${task.due_time}`), 'h:mm a') : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{task.clients?.name || 'Unknown'}</span>
                                <span className="text-xs text-muted-foreground">{task.clients?.state}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">{task.title}</TableCell>
                            <TableCell>
                              <TaskStatusBadge status={status} />
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger><Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => router.push(`/clients/${task.client_id}#tasks`)}
                                  >
                                    <User className="w-4 h-4 mr-2" />
                                    View Client
                                  </DropdownMenuItem>
                                  {status !== 'completed' && (
                                    <DropdownMenuItem onClick={() => handleCompleteTask(task)}>
                                      <Check className="w-4 h-4 mr-2" />
                                      Mark Complete
                                    </DropdownMenuItem>
                                  )}
                                  {status === 'overdue' && (
                                    <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'pending')}>
                                      <Clock className="w-4 h-4 mr-2" />
                                      Mark as Upcoming
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={async () => {
                                      try {
                                        await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
                                        setTasks(prev => prev.filter(t => t.id !== task.id))
                                        toast.success('Task deleted')
                                      } catch {
                                        toast.error('Failed to delete task')
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={6} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium text-muted-foreground">Description</p>
                                    <p className="mt-1">{task.description || 'No description'}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Created</p>
                                    <p className="mt-1">{format(parseISO(task.created_at), 'MMM d, yyyy h:mm a')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">Status History</p>
                                    <p className="mt-1">
                                      {status === 'completed' && task.completed_at && (
                                        <>Completed: {format(parseISO(task.completed_at), 'MMM d, yyyy h:mm a')}</>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
                <TableCaption className="p-4 text-sm text-muted-foreground">
                  {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''} • Click row to expand • Click client name to view case
                </TableCaption>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

import { Suspense } from 'react'

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading tasks...</div>}>
      <TasksPageContent />
    </Suspense>
  )
}