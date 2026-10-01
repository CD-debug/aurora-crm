'use client'

import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Property, ClosingData } from '@/lib/data/types'

interface ClosingSectionProps {
  properties: Property[]
  closingData: ClosingData[]
  onEdit: () => void
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ClosingSection({ properties, closingData, onEdit }: ClosingSectionProps) {
  const closingMap = new Map(closingData.map((cd) => [cd.property_id, cd]))

  return (
    <div className="rounded-xl border bg-card section-accent-teal">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Closing</h2>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>
      <div className="divide-y">
        {properties.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No properties recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Resort Name</th>
                  <th className="text-right p-3 font-medium">Resort Settlement</th>
                  <th className="text-right p-3 font-medium">Invoiced</th>
                  <th className="text-left p-3 font-medium">Disposition</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => {
                  const cd = closingMap.get(p.id)
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{p.resort_name}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{formatCurrency(cd?.resort_settlement ?? null)}</td>
                      <td className="p-3 text-right font-mono tabular-nums">{formatCurrency(cd?.invoiced ?? null)}</td>
                      <td className="p-3">{cd?.disposition ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
