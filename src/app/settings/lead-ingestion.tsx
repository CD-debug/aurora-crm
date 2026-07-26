'use client'

import { useState, useEffect } from 'react'
import { getSettings, updateSettings, regenerateApiKey } from '@/lib/data/settings-actions'
import { toast } from 'sonner'
import { Webhook, Copy, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react'

export function LeadIngestion() {
  const [enabled, setEnabled] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings('lead_ingestion')
        setEnabled((data.enabled as boolean) ?? false)
        setApiKey((data.api_key as string) ?? '')
        setWebhookUrl((data.webhook_url as string) ?? '')
        setLoaded(true)
      } catch {
        toast.error('Failed to load lead ingestion settings')
      }
    }
    load()
  }, [])

  const save = async () => {
    setLoading(true)
    try {
      await updateSettings('lead_ingestion', { enabled, api_key: apiKey || null, webhook_url: webhookUrl || null })
      toast.success('Lead ingestion settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateKey = async () => {
    setLoading(true)
    try {
      const newKey = await regenerateApiKey()
      setApiKey(newKey)
      toast.success('API key regenerated')
    } catch {
      toast.error('Failed to regenerate API key')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Lead Ingestion</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Webhook className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Lead Ingestion</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Accept incoming leads via API webhook. Enable to receive leads from external sources.
      </p>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Enable API Ingestion</p>
            <p className="text-xs text-muted-foreground">Allow external services to submit leads via API</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* API Key */}
        <div className="rounded-lg border p-4">
          <label className="text-sm font-medium block mb-2">API Key</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-sm bg-background px-3 py-2 rounded border">
              {showKey ? (apiKey || 'No key generated') : (apiKey ? '••••••••••••••••••••••••••••••••' : 'No key generated')}
            </div>
            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 rounded-lg border hover:bg-muted"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(apiKey)}
              disabled={!apiKey}
              className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50"
              title="Copy key"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleRegenerateKey}
              disabled={loading}
              className="p-2 rounded-lg border hover:bg-muted disabled:opacity-50"
              title="Regenerate key"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Use this key in the Authorization header: Bearer {'<api_key>'}</p>
        </div>

        {/* Webhook URL */}
        <div className="rounded-lg border p-4">
          <label className="text-sm font-medium block mb-2">Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://your-domain.com/api/leads"
          />
          <p className="text-xs text-muted-foreground mt-2">Optional callback URL for lead status updates</p>
        </div>

        {/* API Example */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-2">API Usage Example</p>
          <pre className="text-xs font-mono bg-background rounded p-3 overflow-x-auto border">
{`curl -X POST http://localhost:3000/api/leads \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "name": "John Smith",
    "phone": "(555) 123-4567",
    "email": "john@example.com",
    "state": "FL",
    "zip": "32801",
    "source": "website"
  }'`}
          </pre>
        </div>

        <button
          onClick={save}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Lead Ingestion Settings
        </button>
      </div>
    </div>
  )
}
