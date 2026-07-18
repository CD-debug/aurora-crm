'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { NavRail, Toaster, AuroraArcStepper, PageHeader, ClientPageHeader, ClientHealthBadge, StageBadge, TaskStatusBadge } from '@/components/shared'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
import { 
  Calendar, Clock, DollarSign, Home, AlertTriangle, CheckCircle, 
  Plus, Trash2, Edit, Mail, Phone, MessageSquare, ChevronDown, ChevronUp,
  FileText, Building2, Target, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'

interface Client {
  id: string
  name: string
  phone: string
  email: string
  state: string
  zip: string
  stage: 'consultation' | 'exit_plan' | 'in_progress' | 'resolved'
  stage_entered_at: string
  case_opened_at: string
  last_contact_at: string | null
  health_status: 'on_track' | 'at_risk' | 'stalled'
  tags: string[]
}

interface Property {
  id: string
  client_id: string
  resort_name: string
  resort_location: string
  unit_number: string | null
  purchase_price: number | null
  loan_balance: number | null
  maintenance_fee: number | null
  fee_due_date: string | null
  paid_off_at: string | null
  status: 'active' | 'paid_off' | 'foreclosed' | 'relinquished'
  document_reference: string | null
  value_eliminated: number | null
}

interface Note {
  id: string
  client_id: string
  channel: 'call' | 'email' | 'sms' | 'meeting' | 'internal'
  content: string
  created_at: string
  author_id: string
}

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
}

const STAGE_LABELS = {
  consultation: 'Consultation',
  exit_plan: 'Exit Plan',
  in_progress: 'In Progress',
  resolved: 'Resolved',
} as const

const CHANNEL_LABELS = {
  call: 'Call',
  email: 'Email',
  sms: 'SMS',
  meeting: 'Meeting',
  internal: 'Internal',
} as const

const CHANNEL_ICONS = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Calendar,
  internal: FileText,
} as const

export default function Client360Page() {
  const params = useParams()
  const searchParams = useSearchParams()
  const clientId = params.clientId as string
  const [client, setClient] = useState<Client | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'properties' | 'notes' | 'tasks'>('overview')
  const supabase = createClient()

  // Sheets state
  const [addPropertyOpen, setAddPropertyOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [stageConfirmOpen, setStageConfirmOpen] = useState(false)
  const [pendingStage, setPendingStage] = useState<string>('')

  // Form state
  const [newProperty, setNewProperty] = useState({
    resort_name: '', resort_location: '', unit_number: '',
    purchase_price: '', loan_balance: '', maintenance_fee: '',
    fee_due_date: '', document_reference: ''
  })
  const [newNote, setNewNote] = useState({ channel: 'call' as const, content: '' })
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', due_time: '' })

  useEffect(() => {
    fetchAllData()
  }, [clientId])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [clientRes, propsRes, notesRes, tasksRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/clients/${clientId}/properties`),
        fetch(`/api/notes/${clientId}`),
        fetch(`/api/tasks?clientId=${clientId}`),
      ])
      
      if (clientRes.ok) setClient((await clientRes.json()).client)
      if (propsRes.ok) setProperties((await propsRes.json()).properties || [])
      if (notesRes.ok) setNotes((await notesRes.json()).notes || [])
      if (tasksRes.ok) setTasks((await tasksRes.json()).tasks || [])
    } catch (error) {
      console.error('Failed to fetch client data:', error)
      toast.error('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  const handleStageClick = (stage: string) => {
    if (stage !== client?.stage) {
      setPendingStage(stage)
      setStageConfirmOpen(true)
    }
  }

  const confirmStageChange = async () => {
    if (!client || !pendingStage) return
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: pendingStage })
      })
      if (res.ok) {
        setClient(prev => prev ? { ...prev, stage: pendingStage as any, stage_entered_at: new Date().toISOString() } : null)
        toast.success(`Stage updated to ${STAGE_LABELS[pendingStage as keyof typeof STAGE_LABELS]}`)
      } else {
        toast.error('Failed to update stage')
      }
    } catch {
      toast.error('Failed to update stage')
    }
    setStageConfirmOpen(false)
    setPendingStage('')
  }

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/clients/${clientId}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newProperty, client_id: clientId })
      })
      if (res.ok) {
        const data = await res.json()
        setProperties(prev => [data.property, ...prev])
        setAddPropertyOpen(false)
        setNewProperty({ resort_name: '', resort_location: '', unit_number: '', purchase_price: '', loan_balance: '', maintenance_fee: '', fee_due_date: '', document_reference: '' })
        toast.success('Property added')
      } else {
        toast.error('Failed to add property')
      }
    } catch {
      toast.error('Failed to add property')
    }
  }

  const handleTogglePropertyPaid = async (property: Property) => {
    const newStatus = property.status === 'paid_off' ? 'active' : 'paid_off'
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, paid_off_at: newStatus === 'paid_off' ? new Date().toISOString() : null })
      })
      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === property.id ? { ...p, status: newStatus, paid_off_at: newStatus === 'paid_off' ? new Date().toISOString() : null } : p))
        toast.success(newStatus === 'paid_off' ? 'Property marked as paid off' : 'Property reactivated')
      }
    } catch {
      toast.error('Failed to update property')
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/notes/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      })
      if (res.ok) {
        const data = await res.json()
        setNotes(prev => [data.note, ...prev])
        setAddNoteOpen(false)
        setNewNote({ channel: 'call', content: '' })
        toast.success('Note added')
      } else {
        toast.error('Failed to add note')
      }
    } catch {
      toast.error('Failed to add note')
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, client_id: clientId })
      })
      if (res.ok) {
        const data = await res.json()
        setTasks(prev => [...prev, data.task].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()))
        setAddTaskOpen(false)
        setNewTask({ title: '', description: '', due_date: '', due_time: '' })
        toast.success('Task created')
      } else {
        toast.error('Failed to create task')
      }
    } catch {
      toast.error('Failed to create task')
    }
  }

  const handleTaskComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null })
      })
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null } : t))
        toast.success(newStatus === 'completed' ? 'Task completed' : 'Task reopened')
      }
    } catch {
      toast.error('Failed to update task')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <NavRail />
        <main className="flex-1 ml-16 overflow-auto transition-all duration-200 lg:ml-64">
          <Toaster />
          <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
            Loading client...
          </div>
        </main>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-screen bg-background">
        <NavRail />
        <main className="flex-1 ml-16 overflow-auto transition-all duration-200 lg:ml-64">
          <Toaster />
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-heading font-semibold">Client not found</h1>
          </div>
        </main>
      </div>
    )
  }

  const daysInStage = differenceInDays(new Date(), new Date(client.stage_entered_at))
  const totalDays = differenceInDays(new Date(), new Date(client.case_opened_at))
  const activeProperties = properties.filter(p => p.status === 'active')
  const paidOffProperties = properties.filter(p => p.status === 'paid_off')
  const totalDebtEliminated = properties.reduce((sum, p) => sum + (p.value_eliminated || 0), 0)
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'overdue')
  const overdueTasks = tasks.filter(t => t.status === 'overdue')

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto transition-all duration-200 lg:ml-64">
        <Toaster />
        
        <ClientPageHeader
          clientName={client.name}
          healthStatus={client.health_status}
          onBack={() => window.history.back()}
        />

        <div className="container mx-auto px-4 pb-8">
          {/* Pipeline Stepper */}
          <div className="mb-6" id="statistics">
            <AuroraArcStepper
              currentStage={client.stage}
              onStageClick={handleStageClick}
              variant="full"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Main Column */}
            <div className="space-y-6">
              {/* Case Statistics */}
              <section id="statistics" className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Case Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Days in Stage" value={daysInStage} icon={<Clock className="w-5 h-5" />} />
                  <StatCard label="Total Days Open" value={totalDays} icon={<Calendar className="w-5 h-5" />} />
                  <StatCard label="Active Properties" value={activeProperties.length} icon={<Home className="w-5 h-5" />} />
                  <StatCard label="Properties Paid Off" value={paidOffProperties.length} icon={<CheckCircle className="w-5 h-5" />} />
                  <StatCard label="Debt Eliminated" value={`$${totalDebtEliminated.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} />
                  <StatCard label="Pending Tasks" value={pendingTasks.length} icon={<Target className="w-5 h-5" />} />
                  <StatCard label="Overdue Tasks" value={overdueTasks.length} icon={<AlertTriangle className="w-5 h-5" />} />
                  <StatCard label="Last Contact" value={client.last_contact_at ? format(new Date(client.last_contact_at), 'MMM d, yyyy') : 'Never'} icon={<MessageSquare className="w-5 h-5" />} />
                </div>
              </section>

              {/* Properties */}
              <section id="properties" className="rounded-xl border bg-card">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Property Records ({properties.length})
                  </h2>
                  <Button size="sm" onClick={() => setAddPropertyOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Property
                  </Button>
                </div>
                <div className="divide-y">
                  {properties.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="mb-2">No properties recorded</p>
                      <Button size="sm" onClick={() => setAddPropertyOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add First Property
                      </Button>
                    </div>
                  ) : (
                    properties.map((prop) => (
                      <PropertyRow key={prop.id} property={prop} onTogglePaid={handleTogglePropertyPaid} />
                    ))
                  )}
                </div>
              </section>

              {/* Notes */}
              <section id="notes" className="rounded-xl border bg-card">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes & Communication ({notes.length})
                  </h2>
                  <Button size="sm" onClick={() => setAddNoteOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>
                <div className="divide-y">
                  {notes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="mb-2">No notes yet</p>
                      <Button size="sm" onClick={() => setAddNoteOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add First Note
                      </Button>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <NoteRow key={note.id} note={note} />
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Sticky Right Column - Tasks */}
            <div className="hidden lg:block sticky top-20 space-y-6" id="tasks">
              <section className="rounded-xl border bg-card">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Tasks & Appointments ({tasks.length})
                  </h2>
                  <Button size="sm" onClick={() => setAddTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Task
                  </Button>
                </div>
                <div className="divide-y">
                  {tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="mb-2">Nothing due today. Add a task to keep this case moving.</p>
                      <Button size="sm" onClick={() => setAddTaskOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </Button>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskRow key={task.id} task={task} onComplete={handleTaskComplete} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Sheets */}
        <StageConfirmSheet open={stageConfirmOpen} onOpenChange={setStageConfirmOpen} pendingStage={pendingStage} onConfirm={confirmStageChange} clientName={client.name} />
        <AddPropertySheet open={addPropertyOpen} onOpenChange={setAddPropertyOpen} form={newProperty} setForm={setNewProperty} onSubmit={handleAddProperty} />
        <AddNoteSheet open={addNoteOpen} onOpenChange={setAddNoteOpen} form={newNote} setForm={setNewNote} onSubmit={handleAddNote} />
        <AddTaskSheet open={addTaskOpen} onOpenChange={setAddTaskOpen} form={newTask} setForm={setNewTask} onSubmit={handleAddTask} />
      </main>
    </div>
  )
}

// Helper Components
function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums">{value}</p>
    </div>
  )
}

function PropertyRow({ property, onTogglePaid }: { property: Property; onTogglePaid: (p: Property) => void }) {
  const isPaid = property.status === 'paid_off'
  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{property.resort_name}</span>
            <Badge variant="outline" className={cn(
              isPaid && 'bg-green-100 text-green-800 border-green-200',
              !isPaid && 'bg-blue-100 text-blue-800 border-blue-200'
            )}>
              {property.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{property.resort_location}</p>
          {property.unit_number && <p className="text-sm text-muted-foreground">Unit: {property.unit_number}</p>}
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {property.loan_balance !== null && <span><DollarSign className="w-3 h-3 inline mr-1" /> Balance: ${Number(property.loan_balance).toLocaleString()}</span>}
            {property.maintenance_fee !== null && <span><Home className="w-3 h-3 inline mr-1" /> Maint: ${Number(property.maintenance_fee).toLocaleString()}</span>}
            {property.fee_due_date && <span><Calendar className="w-3 h-3 inline mr-1" /> Due: {format(new Date(property.fee_due_date), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <Button
          variant={isPaid ? 'secondary' : 'default'}
          size="sm"
          onClick={() => onTogglePaid(property)}
        >
          {isPaid ? 'Reactivate' : 'Mark Paid Off'}
        </Button>
      </div>
    </div>
  )
}

function NoteRow({ note }: { note: Note }) {
  const Icon = CHANNEL_ICONS[note.channel]
  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {CHANNEL_LABELS[note.channel]}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: (t: Task) => void }) {
  const isOverdue = task.status === 'overdue' || (task.status === 'pending' && new Date(task.due_date) < new Date())
  const status = isOverdue ? 'overdue' : task.status
  
  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 h-6 w-6"
          onClick={() => onComplete(task)}
        >
          {status === 'completed' ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <div className="w-4 h-4 border rounded" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{task.title}</span>
            <TaskStatusBadge status={status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            {task.due_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.due_time}</span>}
          </div>
          {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
        </div>
      </div>
    </div>
  )
}

// Sheets
function StageConfirmSheet({ open, onOpenChange, pendingStage, onConfirm, clientName }: { open: boolean; onOpenChange: (o: boolean) => void; pendingStage: string; onConfirm: () => void; clientName: string }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Confirm Stage Change</SheetTitle>
          <SheetDescription>
            Move <strong>{clientName}</strong> from current stage to <strong>{STAGE_LABELS[pendingStage as keyof typeof STAGE_LABELS]}</strong>?
            This will timestamp the transition and recalculate health status.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function AddPropertySheet({ open, onOpenChange, form, setForm, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; form: any; setForm: (f: any) => void; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger><Button variant="outline">Add Property</Button></SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Add Property</SheetTitle>
          <SheetDescription>Add a new timeshare/fractional property for this client</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Resort Name *</label>
            <Input value={form.resort_name} onChange={e => setForm({...form, resort_name: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Resort Location *</label>
            <Input value={form.resort_location} onChange={e => setForm({...form, resort_location: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit Number</label>
            <Input value={form.unit_number} onChange={e => setForm({...form, unit_number: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Price</label>
              <Input type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Loan Balance</label>
              <Input type="number" step="0.01" value={form.loan_balance} onChange={e => setForm({...form, loan_balance: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Maintenance Fee</label>
              <Input type="number" step="0.01" value={form.maintenance_fee} onChange={e => setForm({...form, maintenance_fee: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fee Due Date</label>
              <Input type="date" value={form.fee_due_date} onChange={e => setForm({...form, fee_due_date: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Reference (URL)</label>
            <Input value={form.document_reference} onChange={e => setForm({...form, document_reference: e.target.value})} placeholder="https://..." />
          </div>
          <SheetFooter>
            <Button type="submit" className="w-full">Add Property</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function AddNoteSheet({ open, onOpenChange, form, setForm, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; form: any; setForm: (f: any) => void; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger><Button variant="outline">Add Note</Button></SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Add Note</SheetTitle>
          <SheetDescription>Log a communication or internal note</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel *</label>
            <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content *</label>
            <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={6} required />
          </div>
          <SheetFooter>
            <Button type="submit" className="w-full">Add Note</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function AddTaskSheet({ open, onOpenChange, form, setForm, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; form: any; setForm: (f: any) => void; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger><Button variant="outline">Add Task</Button></SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Add Task</SheetTitle>
          <SheetDescription>Schedule a follow-up or action item</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date *</label>
              <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Time</label>
              <Input type="time" value={form.due_time} onChange={e => setForm({...form, due_time: e.target.value})} />
            </div>
          </div>
          <SheetFooter>
            <Button type="submit" className="w-full">Create Task</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

