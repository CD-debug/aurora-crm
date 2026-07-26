'use client'

// Client 360 (PRD §11) — the main operational surface. Everything computed:
// health/last-contact come from clients_with_health, task status from
// due_date + completed_at, financial progress from property rows. One query
// fetches the whole workspace; every mutation invalidates the shared keys
// so the Tasks page and directory stay in sync (PRD §7.4).

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import {
  Calendar, Clock, DollarSign, Home, AlertTriangle, CheckCircle, Plus, Trash2,
  Mail, Phone, MessageSquare, FileText, Building2, Target, TrendingUp, Pencil,
  CalendarClock, FileWarning, Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { NavRail, Breadcrumb, AuroraArcStepper, ClientHealthBadge, StageBadge, TaskStatusBadge } from '@/components/shared'
import { createClient } from '@/lib/supabase/client'
import { fetchClient360, invalidateAfterMutation } from '@/lib/data/client-queries'
import { queryKeys } from '@/lib/data/query-keys'
import {
  createNote, deleteNote, createProperty, updateProperty, setPropertyPaidOff, deleteProperty,
  createTask, setTaskCompleted, deleteTask, updateClientStage, updateClient,
} from '@/lib/data/mutations'
import {
  daysSince, financialProgress, isDueSoon, stagePercent, taskStatus, STAGE_LABELS,
} from '@/lib/data/domain'
import type { NoteChannel, PipelineStage, Property } from '@/lib/data/types'
import { cn } from '@/lib/utils'

const CHANNEL_META: Record<NoteChannel, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  phone: { label: 'Phone', icon: Phone },
  text: { label: 'Text', icon: MessageSquare },
}

const EMPTY_PROPERTY_FORM = {
  resort_name: '', resort_location: '', unit_number: '',
  purchase_price: '', loan_balance: '', maintenance_fee: '',
  fee_due_date: '', document_reference: '',
}

export default function Client360Page() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const queryClient = useQueryClient()
  const [supabase] = useState(() => createClient())

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: () => fetchClient360(supabase, clientId),
    retry: false,
  })

  // --- Stage transition (inline confirm, PRD §7.5/§11.5) ---------------------
  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null)
  const [stageSaving, setStageSaving] = useState(false)

  const confirmStageChange = async () => {
    if (!pendingStage) return
    setStageSaving(true)
    try {
      await updateClientStage(clientId, pendingStage)
      await invalidateAfterMutation(queryClient, clientId)
      toast.success(`Stage updated to ${STAGE_LABELS[pendingStage]}`)
      setPendingStage(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the stage. Try again.")
    } finally {
      setStageSaving(false)
    }
  }

  // --- Notes (inline quick-add, PRD §11.3) -----------------------------------
  const [noteChannel, setNoteChannel] = useState<NoteChannel>('phone')
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)

  const submitNote = async () => {
    if (!noteContent.trim() || noteSaving) return
    setNoteSaving(true)
    try {
      await createNote({ client_id: clientId, channel: noteChannel, content: noteContent.trim() })
      await invalidateAfterMutation(queryClient, clientId)
      setNoteContent('')
      toast.success('Note saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save this note. Check your connection and try again.")
    } finally {
      setNoteSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId, clientId)
      await invalidateAfterMutation(queryClient, clientId)
      toast.success('Note deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete this note.")
    }
  }

  // --- Properties --------------------------------------------------------------
  const [propertySheetOpen, setPropertySheetOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [propertyForm, setPropertyForm] = useState(EMPTY_PROPERTY_FORM)
  const [propertySaving, setPropertySaving] = useState(false)
  const [payoffProperty, setPayoffProperty] = useState<Property | null>(null)
  const [payoffValue, setPayoffValue] = useState('')

  const openAddProperty = () => {
    setEditingProperty(null)
    setPropertyForm(EMPTY_PROPERTY_FORM)
    setPropertySheetOpen(true)
  }

  const openEditProperty = (p: Property) => {
    setEditingProperty(p)
    setPropertyForm({
      resort_name: p.resort_name,
      resort_location: p.resort_location,
      unit_number: p.unit_number ?? '',
      purchase_price: p.purchase_price != null ? String(p.purchase_price) : '',
      loan_balance: p.loan_balance != null ? String(p.loan_balance) : '',
      maintenance_fee: p.maintenance_fee != null ? String(p.maintenance_fee) : '',
      fee_due_date: p.fee_due_date ?? '',
      document_reference: p.document_reference ?? '',
    })
    setPropertySheetOpen(true)
  }

  const submitProperty = async (e: React.FormEvent) => {
    e.preventDefault()
    setPropertySaving(true)
    const payload = {
      client_id: clientId,
      resort_name: propertyForm.resort_name,
      resort_location: propertyForm.resort_location,
      unit_number: propertyForm.unit_number || null,
      purchase_price: propertyForm.purchase_price ? Number(propertyForm.purchase_price) : null,
      loan_balance: propertyForm.loan_balance ? Number(propertyForm.loan_balance) : null,
      maintenance_fee: propertyForm.maintenance_fee ? Number(propertyForm.maintenance_fee) : null,
      fee_due_date: propertyForm.fee_due_date || null,
      document_reference: propertyForm.document_reference || null,
    }
    try {
      if (editingProperty) {
        await updateProperty(editingProperty.id, clientId, payload)
        toast.success('Property updated')
      } else {
        await createProperty(payload)
        toast.success('Property added')
      }
      await invalidateAfterMutation(queryClient, clientId)
      await queryClient.refetchQueries({ queryKey: queryKeys.clients.detail(clientId) })
      setPropertySheetOpen(false)
      setPropertyForm(EMPTY_PROPERTY_FORM)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this property. Check the details and try again.")
    } finally {
      setPropertySaving(false)
    }
  }

  const confirmPayoff = async () => {
    if (!payoffProperty) return
    try {
      await setPropertyPaidOff(
        payoffProperty.id,
        clientId,
        true,
        payoffValue ? Number(payoffValue) : null
      )
      await invalidateAfterMutation(queryClient, clientId)
      toast.success(`${payoffProperty.resort_name} marked paid off`)
      setPayoffProperty(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update this property.")
    }
  }

  const handleReactivate = async (p: Property) => {
    try {
      await setPropertyPaidOff(p.id, clientId, false)
      await invalidateAfterMutation(queryClient, clientId)
      toast.success(`${p.resort_name} reactivated`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update this property.")
    }
  }

  const handleDeleteProperty = async (p: Property) => {
    try {
      await deleteProperty(p.id, clientId)
      await invalidateAfterMutation(queryClient, clientId)
      toast.success(`${p.resort_name} removed`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete this property.")
    }
  }

  // --- Tasks (shared record with the Tasks page, PRD §11.4/§7.4) ---------------
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskSaving, setTaskSaving] = useState(false)

  const submitTask = async () => {
    if (!taskTitle.trim() || !taskDue || taskSaving) return
    setTaskSaving(true)
    try {
      await createTask({ client_id: clientId, title: taskTitle.trim(), due_date: taskDue })
      await invalidateAfterMutation(queryClient, clientId)
      setTaskTitle('')
      setTaskDue('')
      toast.success('Task created — it also appears on the Tasks page')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create this task. Try again.")
    } finally {
      setTaskSaving(false)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await setTaskCompleted(taskId, clientId, completed)
      await invalidateAfterMutation(queryClient, clientId)
      toast.success(completed ? 'Task completed' : 'Task reopened')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update this task.")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId, clientId)
      await invalidateAfterMutation(queryClient, clientId)
      toast.success('Task deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete this task.")
    }
  }

  // --- Unified destructive confirm (replaces window.confirm) ------------------
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'note'; id: string; label: string }
    | { kind: 'task'; id: string; label: string }
    | { kind: 'property'; id: string; label: string }
    | null
  >(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.kind === 'note') {
        await handleDeleteNote(deleteTarget.id)
      } else if (deleteTarget.kind === 'task') {
        await handleDeleteTask(deleteTarget.id)
      } else if (deleteTarget.kind === 'property') {
        await handleDeleteProperty({ id: deleteTarget.id } as Property)
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  // --- Edit client -------------------------------------------------------------
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', state: '', zip: '', tags: '' })
  const [editSaving, setEditSaving] = useState(false)

  const openEdit = () => {
    if (!data) return
    const c = data.client
    setEditForm({ name: c.name, phone: c.phone, email: c.email, state: c.state, zip: c.zip, tags: c.tags.join(', ') })
    setEditOpen(true)
  }

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      await updateClient(clientId, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        state: editForm.state,
        zip: editForm.zip,
        tags: editForm.tags ? editForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })
      await invalidateAfterMutation(queryClient, clientId)
      toast.success('Client details updated')
      setEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save changes. Check the details and try again.")
    } finally {
      setEditSaving(false)
    }
  }

  // --- Render -------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <NavRail />
        <main className="flex-1 ml-16 overflow-auto">
          <div className="container mx-auto px-4 py-8 space-y-4">
            <div className="h-8 w-64 rounded-md bg-muted/60 animate-pulse" />
            <div className="h-24 rounded-xl bg-muted/60 animate-pulse" />
            <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen bg-background">
        <NavRail />
        <main className="flex-1 ml-16 overflow-auto">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-heading font-semibold mb-2">Client not found</h1>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error ? error.message : "This case may have been deleted, or the link is wrong."}
            </p>
            <Button onClick={() => router.push('/clients')}>Back to Clients</Button>
          </div>
        </main>
      </div>
    )
  }

  const { client, properties, notes, tasks } = data
  const fin = financialProgress(properties)
  const openTasks = tasks.filter((t) => !t.completed_at)
  const overdueTasks = openTasks.filter((t) => taskStatus(t) === 'overdue')
  const docsMissing = properties.filter((p) => !p.document_reference).length
  const nextFeeDue = properties
    .filter((p) => p.status === 'active' && p.fee_due_date)
    .map((p) => p.fee_due_date!)
    .sort()[0]

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        {/* Sticky header (PRD §11.6) */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} className="mb-2" />
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-heading font-semibold">{client.name}</h1>
                <ClientHealthBadge status={client.health_status} />
                <StageBadge stage={client.stage} />
                {client.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono">{client.phone}</span>
                <span className="hidden md:inline">{client.email}</span>
                <span>{client.state} {client.zip}</span>
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 pb-10">
          {/* Aurora Arc stepper */}
          <div className="pt-6 pb-2">
            <AuroraArcStepper
              currentStage={client.stage}
              onStageClick={(stage) => setPendingStage(stage)}
              variant="full"
            />
            {pendingStage && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-sm">
                  Move <strong>{client.name}</strong> to <strong>{STAGE_LABELS[pendingStage]}</strong>?
                  The transition will be timestamped and health recalculated.
                </p>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setPendingStage(null)} disabled={stageSaving}>Cancel</Button>
                  <Button size="sm" onClick={confirmStageChange} disabled={stageSaving}>
                    {stageSaving ? 'Updating…' : 'Confirm'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mt-4">
            {/* Primary column: statistics → properties → notes (PRD §11.6) */}
            <div className="space-y-6 min-w-0">
              {/* §11.1 Case statistics — all computed */}
              <section id="statistics" className="rounded-xl border bg-card p-6 scroll-mt-24">
                <h2 className="text-lg font-semibold mb-4">Case Statistics</h2>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  className="grid grid-cols-2 md:grid-cols-3 gap-4"
                >
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard label="Days in Stage" value={daysSince(client.stage_entered_at)} icon={<Clock className="w-4 h-4" />} /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard label="Total Days in Process" value={daysSince(client.case_opened_at)} icon={<Calendar className="w-4 h-4" />} /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard label="Case Opened" value={format(new Date(client.case_opened_at), 'MMM d, yyyy')} icon={<FileText className="w-4 h-4" />} small /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard
                    label="Last Contact"
                    value={client.last_contact_at ? format(new Date(client.last_contact_at), 'MMM d, yyyy') : 'Never'}
                    icon={<MessageSquare className="w-4 h-4" />}
                    small
                  /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard
                    label="Next Scheduled Action"
                    value={client.next_task_due ? format(new Date(client.next_task_due + 'T00:00:00'), 'MMM d, yyyy') : 'None scheduled'}
                    icon={<CalendarClock className="w-4 h-4" />}
                    small
                    warn={!client.next_task_due && client.stage !== 'resolved'}
                  /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard label="Percent Complete" value={`${stagePercent(client.stage)}%`} icon={<Percent className="w-4 h-4" />} /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard label="Open Tasks" value={openTasks.length} icon={<Target className="w-4 h-4" />} /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard label="Overdue Tasks" value={overdueTasks.length} icon={<AlertTriangle className="w-4 h-4" />} warn={overdueTasks.length > 0} /></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><StatCard
                    label="Next Maintenance Fee"
                    value={nextFeeDue ? format(new Date(nextFeeDue + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                    icon={<Home className="w-4 h-4" />}
                    small
                  /></motion.div>
                </motion.div>

                {/* Amount owed vs. eliminated (PRD §11.1) */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      Owed vs. Eliminated
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      ${fin.eliminated.toLocaleString()} eliminated · ${fin.owed.toLocaleString()} outstanding
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-border overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fin.percent}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                      className="h-full bg-aurora-arc rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono tabular-nums">
                    <span>{fin.percent}% eliminated</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileWarning className="w-4 h-4" />
                    Document URLs: {properties.length === 0
                      ? 'no properties on file'
                      : docsMissing === 0
                        ? `on file for all ${properties.length} ${properties.length === 1 ? 'property' : 'properties'}`
                        : `missing for ${docsMissing} of ${properties.length}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Value eliminated: <span className="font-mono tabular-nums">${fin.eliminated.toLocaleString()}</span>
                  </span>
                </div>
              </section>

              {/* §11.2 Property records */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                id="properties" className="rounded-xl border bg-card scroll-mt-24"
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Property Records ({properties.length})
                  </h2>
                  <Button size="sm" onClick={openAddProperty}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Property
                  </Button>
                </div>
                <div className="divide-y">
                  {properties.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="mb-3">No properties recorded yet — most cases start with at least one timeshare.</p>
                      <Button size="sm" onClick={openAddProperty}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add the first property
                      </Button>
                    </div>
                  ) : (
                    properties.map((p) => (
                      <PropertyCard
                        key={p.id}
                        property={p}
                        onEdit={() => openEditProperty(p)}
                        onStartPayoff={() => { setPayoffProperty(p); setPayoffValue(p.loan_balance != null ? String(p.loan_balance) : '') }}
                        onReactivate={() => handleReactivate(p)}
                        onDelete={() => setDeleteTarget({ kind: 'property', id: p.id, label: p.resort_name })}
                      />
                    ))
                  )}
                </div>
              </motion.section>

              {/* §11.3 Notes — inline quick-add, newest first */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                id="notes" className="rounded-xl border bg-card scroll-mt-24"
              >
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notes &amp; Communication ({notes.length})
                  </h2>
                </div>
                <div className="p-4 border-b bg-muted/20">
                  <div className="flex gap-2">
                    <Select value={noteChannel} onValueChange={(v) => setNoteChannel(v as NoteChannel)}>
                      <SelectTrigger className="w-[130px]" aria-label="Note channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_META).map(([k, m]) => (
                          <SelectItem key={k} value={k}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitNote() }}
                      placeholder={`Log a ${CHANNEL_META[noteChannel].label.toLowerCase()} with ${client.name}… (Ctrl+Enter to save)`}
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={submitNote} disabled={noteSaving || !noteContent.trim()} className="self-end">
                      {noteSaving ? 'Saving…' : 'Save Note'}
                    </Button>
                  </div>
                </div>
                <div className="divide-y">
                  {notes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No notes yet. Log the first contact above — every touch counts toward this case&apos;s health.
                    </div>
                  ) : (
                    notes.map((note) => {
                      const meta = CHANNEL_META[note.channel]
                      return (
                        <div key={note.id} className="p-4 hover:bg-muted/30 transition-colors group">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <meta.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                                </span>
                                <button
                                  onClick={() => setDeleteTarget({ kind: 'note', id: note.id, label: note.content.slice(0, 60) })}
                                  className="ml-auto opacity-70 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-all"
                                  aria-label="Delete note"
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.section>

              {/* Activity Timeline */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                className="mt-6 rounded-xl border bg-card p-4"
              >
                <h2 className="text-lg font-semibold mb-4">Activity Timeline</h2>
                <ActivityTimeline items={[
                  ...notes.map(n => ({ id: n.id, type: 'note' as const, title: 'Note', description: n.content, date: n.created_at })),
                  ...tasks.map(t => ({ id: t.id, type: 'task' as const, title: t.title, description: t.completed_at ? 'Completed' : t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString()}` : undefined, date: t.created_at })),
                  ...properties.map(p => ({ id: p.id, type: 'property' as const, title: `Property: ${p.resort_name}`, description: p.status === 'paid_off' ? 'Paid off' : undefined, date: p.created_at })),
                ]} />
              </motion.section>
            </div>

            {/* §11.4 Tasks & Appointments — persistent right column */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              className="min-w-0"
            >
              <section id="tasks" className="rounded-xl border bg-card lg:sticky lg:top-24 scroll-mt-24">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Tasks &amp; Appointments
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/tasks?client=${clientId}`)}>
                    Open in Tasks →
                  </Button>
                </div>

                {/* Inline quick-add */}
                <div className="p-3 border-b bg-muted/20 space-y-2">
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitTask() }}
                    placeholder="Follow up on…"
                    aria-label="New task title"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={taskDue}
                      onChange={(e) => setTaskDue(e.target.value)}
                      aria-label="New task due date"
                      className="flex-1"
                    />
                    <Button onClick={submitTask} disabled={taskSaving || !taskTitle.trim() || !taskDue}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="divide-y max-h-[520px] overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nothing due today. Add a task to keep this case moving.
                    </div>
                  ) : (
                    tasks.map((task) => {
                      const status = taskStatus(task)
                      return (
                        <div key={task.id} className={cn('p-3 hover:bg-muted/30 transition-colors group', status === 'completed' && 'opacity-60')}>
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => handleToggleTask(task.id, status !== 'completed')}
                              className="mt-0.5 flex-shrink-0"
                              aria-label={status === 'completed' ? 'Reopen task' : 'Complete task'}
                            >
                              {status === 'completed'
                                ? <CheckCircle className="w-5 h-5 text-green-600" />
                                : <span className="block w-4 h-4 rounded border border-muted-foreground/50 hover:border-primary transition-colors" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn('font-medium text-sm', status === 'completed' && 'line-through')}>{task.title}</span>
                                <TaskStatusBadge status={status} dueSoon={isDueSoon(task)} />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className={cn('flex items-center gap-1 font-mono', status === 'overdue' && 'text-red-600 font-medium')}>
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(task.due_date + 'T00:00:00'), 'MMM d, yyyy')}
                                </span>
                                <button
                                  onClick={() => setDeleteTarget({ kind: 'task', id: task.id, label: task.title })}
                                  className="ml-auto opacity-70 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-all"
                                  aria-label="Delete task"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>
            </motion.div>
          </div>
        </div>

        {/* Add/Edit Property sheet */}
        <Sheet open={propertySheetOpen} onOpenChange={setPropertySheetOpen}>
          <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingProperty ? 'Edit Property' : 'Add Property'}</SheetTitle>
              <SheetDescription>A timeshare or fractional interest tied to this case.</SheetDescription>
            </SheetHeader>
            <form onSubmit={submitProperty} className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Property / Resort Name *</label>
                <Input value={propertyForm.resort_name} onChange={(e) => setPropertyForm({ ...propertyForm, resort_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location (City, State) *</label>
                <Input value={propertyForm.resort_location} onChange={(e) => setPropertyForm({ ...propertyForm, resort_location: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit / Title Number</label>
                <Input value={propertyForm.unit_number} onChange={(e) => setPropertyForm({ ...propertyForm, unit_number: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Original Purchase Price ($)</label>
                  <Input type="number" step="0.01" min="0" value={propertyForm.purchase_price} onChange={(e) => setPropertyForm({ ...propertyForm, purchase_price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Loan Balance ($)</label>
                  <Input type="number" step="0.01" min="0" value={propertyForm.loan_balance} onChange={(e) => setPropertyForm({ ...propertyForm, loan_balance: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Annual Maintenance Fee ($)</label>
                  <Input type="number" step="0.01" min="0" value={propertyForm.maintenance_fee} onChange={(e) => setPropertyForm({ ...propertyForm, maintenance_fee: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Next Fee Due Date</label>
                  <Input type="date" value={propertyForm.fee_due_date} onChange={(e) => setPropertyForm({ ...propertyForm, fee_due_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Document URL</label>
                <Input value={propertyForm.document_reference} onChange={(e) => setPropertyForm({ ...propertyForm, document_reference: e.target.value })} placeholder="https://…" />
              </div>
              <SheetFooter>
                <Button type="submit" className="w-full" disabled={propertySaving}>
                  {propertySaving ? 'Saving…' : editingProperty ? 'Save Changes' : 'Add Property'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Paid-off confirm (value eliminated) */}
        <Sheet open={!!payoffProperty} onOpenChange={(open) => !open && setPayoffProperty(null)}>
          <SheetContent side="right" className="w-full max-w-sm">
            <SheetHeader>
              <SheetTitle>Mark {payoffProperty?.resort_name} paid off?</SheetTitle>
              <SheetDescription>
                The eliminated value feeds the dashboard&apos;s debt-eliminated metric. It defaults to the loan balance — adjust if needed.
              </SheetDescription>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Value Eliminated ($)</label>
                <Input type="number" step="0.01" min="0" value={payoffValue} onChange={(e) => setPayoffValue(e.target.value)} />
              </div>
              <SheetFooter className="flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPayoffProperty(null)}>Cancel</Button>
                <Button className="flex-1" onClick={confirmPayoff}>Mark Paid Off</Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>

        {/* Edit client sheet */}
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Client</SheetTitle>
              <SheetDescription>Contact details and tags for {client.name}.</SheetDescription>
            </SheetHeader>
            <form onSubmit={submitEdit} className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name *</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone *</label>
                <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">State *</label>
                  <Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })} required maxLength={2} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ZIP *</label>
                  <Input value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} required maxLength={10} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="VIP, Referral — comma separated" />
              </div>
              <SheetFooter>
                <Button type="submit" className="w-full" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Destructive confirm — replaces window.confirm */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete {deleteTarget?.kind === 'property' ? 'this property' : deleteTarget?.kind === 'task' ? 'this task' : 'this note'}?
              </DialogTitle>
              <DialogDescription>
                {deleteTarget?.kind === 'property' &&
                  `${deleteTarget.label} will be permanently removed along with its financial history. This can’t be undone.`}
                {deleteTarget?.kind === 'task' &&
                  `"${deleteTarget.label}" will be permanently removed. This can’t be undone.`}
                {deleteTarget?.kind === 'note' &&
                  `This note will be permanently removed. This can’t be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

function StatCard({
  label, value, icon, small = false, warn = false,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  small?: boolean
  warn?: boolean
}) {
  return (
    <div className={cn('p-4 rounded-lg border transition-all hover:shadow-sm', warn ? 'border-amber-300 bg-amber-50' : 'bg-muted/30 hover:bg-muted/50')}>
      <div className={cn('flex items-center gap-2 text-sm mb-1', warn ? 'text-amber-800' : 'text-muted-foreground')}>
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn('font-bold font-mono tabular-nums', small ? 'text-lg' : 'text-2xl', warn && 'text-amber-900')}>{value}</p>
    </div>
  )
}

function PropertyCard({
  property: p, onEdit, onStartPayoff, onReactivate, onDelete,
}: {
  property: Property
  onEdit: () => void
  onStartPayoff: () => void
  onReactivate: () => void
  onDelete: () => void
}) {
  const isPaid = p.status === 'paid_off'
  return (
    <div className={cn('p-4 hover:bg-muted/30 transition-all hover:shadow-sm group', isPaid && 'bg-green-50/40')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium">{p.resort_name}</span>
            <Badge variant="outline" className={cn(
              isPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'
            )}>
              {isPaid ? 'Paid Off' : p.status.replace('_', ' ')}
            </Badge>
            {!p.document_reference ? (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">No document URL</Badge>
            ) : (
              <a href={p.document_reference} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <FileText className="w-3 h-3" /> Contract
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {p.resort_location}{p.unit_number ? ` · Unit ${p.unit_number}` : ''}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground font-mono tabular-nums">
            {p.purchase_price != null && <span>Purchase: ${Number(p.purchase_price).toLocaleString()}</span>}
            {!isPaid && p.loan_balance != null && <span>Owed: ${Number(p.loan_balance).toLocaleString()}</span>}
            {isPaid && p.value_eliminated != null && (
              <span className="text-green-700">Eliminated: ${Number(p.value_eliminated).toLocaleString()}</span>
            )}
            {p.maintenance_fee != null && (
              <span>
                Maint: ${Number(p.maintenance_fee).toLocaleString()}
                {p.fee_due_date ? ` · due ${format(new Date(p.fee_due_date + 'T00:00:00'), 'MMM d, yyyy')}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* PRD §11.2: paid-off as a clickable Yes/No toggle */}
          {isPaid ? (
            <Button variant="secondary" size="sm" onClick={onReactivate}>Reactivate</Button>
          ) : (
            <Button size="sm" onClick={onStartPayoff}>Mark Paid Off</Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit property"><Pencil className="w-3.5 h-3.5" /></Button>
          <Button
            variant="ghost" size="sm" onClick={onDelete} aria-label="Delete property"
            className="text-muted-foreground hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
