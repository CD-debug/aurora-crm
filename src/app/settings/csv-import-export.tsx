'use client'

import { useState, useRef, useCallback } from 'react'
import { exportClientsCsv, importClientsFromCsv } from '@/lib/data/settings-actions'
import { toast } from 'sonner'
import { Download, Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CSV_TEMPLATE_HEADERS = [
  'name','phone','email','state','zip',
  'stage','case_opened_at','tags',
  'resort_name','resort_location','unit_number',
  'purchase_price','loan_balance','maintenance_fee',
  'fee_due_date','document_reference',
]

const REQUIRED_FIELDS = ['name', 'phone', 'email', 'state', 'zip']

const FIELD_DESCRIPTIONS: Record<string, { required: boolean; description: string }> = {
  name: { required: true, description: 'Client full name' },
  phone: { required: true, description: 'Phone number' },
  email: { required: true, description: 'Email address' },
  state: { required: true, description: 'US state code (e.g., FL)' },
  zip: { required: true, description: 'ZIP code' },
  stage: { required: false, description: 'consultation | exit_plan | in_progress | resolved (default: consultation)' },
  case_opened_at: { required: false, description: 'ISO date (YYYY-MM-DD) or leave blank for auto' },
  tags: { required: false, description: 'Semicolon-separated tags (e.g., "vip; timeshare")' },
  resort_name: { required: false, description: 'Property resort/complex name' },
  resort_location: { required: false, description: 'Property location (city, state)' },
  unit_number: { required: false, description: 'Unit or lot number' },
  purchase_price: { required: false, description: 'Original purchase price (numeric)' },
  loan_balance: { required: false, description: 'Current loan balance (numeric)' },
  maintenance_fee: { required: false, description: 'Annual maintenance fee (numeric)' },
  fee_due_date: { required: false, description: 'Fee due date (YYYY-MM-DD)' },
  document_reference: { required: false, description: 'Document or contract reference number' },
}

const SAMPLE_CSV = `name,phone,email,state,zip,stage,resort_name,resort_location,unit_number,purchase_price,loan_balance
John Smith,(555) 123-4567,john@example.com,FL,32801,consultation,Paradise Resort,Orlando FL,Unit 4B,45000,32000
Jane Doe,(555) 987-6543,jane@example.com,TX,77001,exit_plan,Sunset Villas,Houston TX,Unit 12A,62000,48000`

export function CsvImportExport() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; imported?: number; duplicates?: number; error?: string } | null>(null)
  const [showSchema, setShowSchema] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const csv = await exportClientsCsv()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aurora-clients-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Clients exported')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }, [])

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()
      const result = await importClientsFromCsv(text)
      setImportResult({ success: true, imported: result.imported, duplicates: result.duplicates })
      toast.success(`Imported ${result.imported} clients, ${result.duplicates} duplicates found`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setImportResult({ success: false, error: message })
      toast.error(message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const downloadTemplate = useCallback(() => {
    const csv = [CSV_TEMPLATE_HEADERS.join(','), SAMPLE_CSV.split('\n')[1]].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'aurora-crm-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }, [])

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">CSV Import / Export</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Import clients from CSV files or export your current data</p>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />

        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>

        <button
          onClick={() => setShowSchema(!showSchema)}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {showSchema ? 'Hide' : 'Show'} Schema
        </button>
      </div>

      {/* Import Result */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className={`flex items-center gap-3 p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {importResult.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">Successfully imported {importResult.count} clients</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-800">{importResult.error}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schema Reference */}
      <AnimatePresence>
        {showSchema && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold mb-3">CSV Column Reference</h3>
              <div className="space-y-2">
                {CSV_TEMPLATE_HEADERS.map((header) => {
                  const field = FIELD_DESCRIPTIONS[header]
                  return (
                    <div key={header} className="flex items-start gap-3 text-sm">
                      <code className="font-mono text-xs bg-background px-2 py-0.5 rounded border min-w-[140px]">
                        {header}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </code>
                      <span className="text-muted-foreground">{field.description}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">* Required fields. One row = one client + optional one property.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
