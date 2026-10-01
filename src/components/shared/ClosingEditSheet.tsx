'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyInput } from './inputs'
import type { Property, ClosingData, Disposition } from '@/lib/data/types'

interface ClosingEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  properties: Property[]
  closingData: ClosingData[]
  teamMembers: Array<{ id: string; name: string }>
  onSave: (propertyId: string, data: { resort_settlement: string; invoiced: string; disposition: Disposition | null; team_member_id: string | null }) => Promise<void>
}

const DISPOSITIONS: Disposition[] = ['Sent', 'Collected', 'Settled', 'Paid']

export function ClosingEditSheet({ open, onOpenChange, properties, closingData, teamMembers, onSave }: ClosingEditSheetProps) {
  const [saving, setSaving] = useState(false)
  const closingMap = new Map(closingData.map((cd) => [cd.property_id, cd]))

  const [formData, setFormData] = useState<Record<string, { resort_settlement: string; invoiced: string; disposition: Disposition | null; team_member_id: string | null }>>({})

  const getField = (propertyId: string) => {
    if (formData[propertyId]) return formData[propertyId]
    const cd = closingMap.get(propertyId)
    return {
      resort_settlement: cd?.resort_settlement != null ? String(cd.resort_settlement) : '',
      invoiced: cd?.invoiced != null ? String(cd.invoiced) : '',
      disposition: cd?.disposition ?? null,
      team_member_id: cd?.team_member_id ?? null,
    }
  }

  const setField = (propertyId: string, field: string, value: string | Disposition | null) => {
    setFormData((prev) => ({
      ...prev,
      [propertyId]: { ...getField(propertyId), [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        properties.map((p) => {
          const data = getField(p.id)
          return onSave(p.id, data)
        })
      )
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit Closing</SheetTitle>
          <SheetDescription>Enter settlement, invoiced amounts, and disposition for each property.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {properties.map((p) => {
            const data = getField(p.id)
            return (
              <div key={p.id} className="space-y-3 pb-4 border-b last:border-0">
                <h3 className="font-medium text-sm">{p.resort_name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Resort Settlement</label>
                    <CurrencyInput
                      value={data.resort_settlement}
                      onChange={(v) => setField(p.id, 'resort_settlement', v)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Invoiced</label>
                    <CurrencyInput
                      value={data.invoiced}
                      onChange={(v) => setField(p.id, 'invoiced', v)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Disposition</label>
                  <Select
                    value={data.disposition ?? ''}
                    onValueChange={(v) => setField(p.id, 'disposition', (v || null) as Disposition | null)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPOSITIONS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Team Member</label>
                  <Select
                    value={data.team_member_id ?? ''}
                    onValueChange={(v) => setField(p.id, 'team_member_id', v || null)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
