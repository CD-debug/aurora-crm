'use client'

import { useState } from 'react'
import { getSettings, updateSettings } from '@/lib/data/settings-actions'
import { toast } from 'sonner'
import { Settings, Save, Loader2 } from 'lucide-react'

export function GeneralSettings() {
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = async () => {
    if (loaded) return
    setLoading(true)
    try {
      const data = await getSettings('general')
      setCompanyName((data.company_name as string) ?? 'Aurora CRM')
      setLoaded(true)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    setLoading(true)
    try {
      await updateSettings('general', { company_name: companyName })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">General</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Basic configuration for your workspace</p>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onFocus={load}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Your company name"
          />
        </div>
        <button
          onClick={save}
          disabled={loading || !loaded}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  )
}
