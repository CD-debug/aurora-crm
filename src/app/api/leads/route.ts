import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ingestLead, getSettings } from '@/lib/data/settings-actions'
import { clientInput } from '@/lib/data/schemas'
import { z } from 'zod'

const leadBody = clientInput
  .omit({ tags: true })
  .extend({
    source: z.string().trim().max(100).optional(),
  })

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = await createServerClient()

    const settings = await getSettings('lead_ingestion')
    if (!settings.enabled) {
      return NextResponse.json({ error: 'Lead ingestion is not enabled' }, { status: 403 })
    }

    if (settings.api_key !== token) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = leadBody.parse(body)

    const clientId = await ingestLead({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      state: parsed.state,
      zip: parsed.zip,
      source: parsed.source,
    })

    if (settings.webhook_url && typeof settings.webhook_url === 'string') {
      try {
        await fetch(settings.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'lead.created',
            client_id: clientId,
            timestamp: new Date().toISOString(),
          }),
        })
      } catch (err) {
        console.error('Webhook callback failed:', err)
      }
    }

    return NextResponse.json({ success: true, client_id: clientId }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid lead data', details: error.flatten() }, { status: 400 })
    }
    console.error('Lead ingestion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
