'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X, Check, Loader2, Users } from 'lucide-react'
import { listTeamMembers, createTeamMember, deleteTeamMember } from '@/lib/data/mutations'
import type { TeamMember } from '@/lib/data/types'
import { toast } from 'sonner'

export function TeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => {
    try {
      const data = await listTeamMembers()
      setMembers(data)
    } catch {
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      const member = await createTeamMember(name)
      setMembers((prev) => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      toast.success('Team member added')
    } catch {
      toast.error('Failed to add team member')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId === id) {
      try {
        await deleteTeamMember(id)
        setMembers((prev) => prev.filter((m) => m.id !== id))
        setConfirmDeleteId(null)
        toast.success('Team member removed')
      } catch {
        toast.error('Failed to remove team member')
      }
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Team Members</h2>
        </div>
        <div className="space-y-2 h-20">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Team Members</h2>
        <span className="ml-auto text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Names shown when logging notes and tasks. Everyone shares the same login — this just tracks who did what.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a name (e.g., Sarah, Mike, Alex)"
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={saving}
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </form>

      {members.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No team members yet. Add your first name above to start attributing notes and tasks.
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-background border hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">{member.name}</span>
              {confirmDeleteId === member.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-surface-danger text-surface-danger-fg hover:bg-surface-danger/80 transition-colors"
                    aria-label={`Confirm remove ${member.name}`}
                  >
                    <Check className="w-3 h-3" /> Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                    aria-label="Cancel removal"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDelete(member.id)}
                  className="flex-shrink-0 p-1.5 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${member.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
