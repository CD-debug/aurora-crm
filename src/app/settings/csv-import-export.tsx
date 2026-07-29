'use client'

import { useState, useRef, useCallback } from 'react'
import { exportClientsCsv, importClientsFromCsv } from '@/lib/data/settings-actions'
import { toast } from 'sonner'
import { Download, Upload, FileText, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CSV_TEMPLATE_HEADERS = [
  'name','phone','email','state','zip',
  'stage','case_opened_at','tags',
  'co_client_name','dob','ssn_last4','address','phone2','retainer_fee',
  'resort_name','resort_location','unit_number',
  'purchase_price','loan_balance','maintenance_fee',
  'fee_due_date','document_reference',
  'usage_frequency','usage_type','fees_current','fees_behind_amount','maintenance_fees_billed',
]

const FIELD_DESCRIPTIONS: Record<string, { required: boolean; description: string }> = {
  name: { required: true, description: 'Client full name' },
  phone: { required: true, description: 'Primary phone number' },
  email: { required: true, description: 'Email address' },
  state: { required: true, description: 'US state code (e.g., FL)' },
  zip: { required: true, description: 'ZIP code' },
  stage: { required: false, description: 'consultation | exit_plan | in_progress | resolved (default: consultation)' },
  case_opened_at: { required: false, description: 'YYYY-MM-DD or M/D/YYYY — blank = today' },
  tags: { required: false, description: 'Comma or semicolon separated (e.g., "VIP, Referral")' },
  co_client_name: { required: false, description: 'Second client on the case (spouse, co-owner)' },
  dob: { required: false, description: 'Date of birth — YYYY-MM-DD or M/D/YYYY' },
  ssn_last4: { required: false, description: 'Last 4 of SSN — exactly 4 digits' },
  address: { required: false, description: 'Street, city' },
  phone2: { required: false, description: 'Secondary phone' },
  retainer_fee: { required: false, description: 'Retainer amount (e.g., 3500 or $3,500)' },
  resort_name: { required: false, description: 'Resort/complex name — starts a property row' },
  resort_location: { required: false, description: 'Property location (city, state)' },
  unit_number: { required: false, description: 'Unit or lot number' },
  purchase_price: { required: false, description: 'Original purchase price (e.g., 45000 or $45,000)' },
  loan_balance: { required: false, description: 'Current loan balance' },
  maintenance_fee: { required: false, description: 'Annual maintenance fee' },
  fee_due_date: { required: false, description: 'Fee due date — YYYY-MM-DD or M/D/YYYY' },
  document_reference: { required: false, description: 'Contract URL or reference' },
  usage_frequency: { required: false, description: 'annual | biennial | odd_year | even_year' },
  usage_type: { required: false, description: 'fixed_week | floating_week | points_based' },
  fees_current: { required: false, description: 'true/false/yes/no — are maintenance fees up to date?' },
  fees_behind_amount: { required: false, description: 'Amount behind on fees (if not current)' },
  maintenance_fees_billed: { required: false, description: 'Total maintenance fees billed to date' },
}

type ImportResult =
  | { success: true; imported: number; properties: number; duplicates: number; warnings: string[] }
  | { success: false; error: string }

export function CsvImportExport() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
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
      setImportResult({
        success: true,
        imported: result.imported,
        properties: result.properties,
        duplicates: result.duplicates,
        warnings: result.warnings,
      })
      toast.success(`Imported ${result.imported} clients with ${result.properties} properties`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setImportResult({ success: false, error: message })
      toast.error('Import failed — nothing was imported')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const downloadTemplate = useCallback(() => {
    const csv = CSV_TEMPLATE_HEADERS.join(',')
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
      <p className="text-sm text-muted-foreground mb-6">
        Import clients from CSV files or export your current data. One row = one property — repeat the client on multiple rows to import several properties for them.
      </p>

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
            className="mb-6 space-y-2"
          >
            {importResult.success ? (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-success border border-surface-success-fg/30">
                  <CheckCircle className="w-5 h-5 text-surface-success-fg flex-shrink-0" />
                  <span className="text-sm text-surface-success-fg">
                    Imported {importResult.imported} client{importResult.imported !== 1 ? 's' : ''} with {importResult.properties} propert{importResult.properties !== 1 ? 'ies' : 'y'}
                    {importResult.duplicates > 0 && ` · ${importResult.duplicates} duplicate${importResult.duplicates !== 1 ? 's' : ''} skipped`}
                  </span>
                </div>
                {importResult.warnings.length > 0 && (
                  <div className="p-4 rounded-lg bg-surface-warning border border-surface-warning-fg/30">
                    <div className="flex items-center gap-2 text-surface-warning-fg font-medium text-sm mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      {importResult.warnings.length} warning{importResult.warnings.length !== 1 ? 's' : ''} (imported anyway)
                    </div>
                    <ul className="text-xs text-surface-warning-fg space-y-1 list-disc list-inside">
                      {importResult.warnings.slice(0, 8).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {importResult.warnings.length > 8 && (
                        <li>…and {importResult.warnings.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-lg bg-surface-danger border border-surface-danger-fg/30">
                <div className="flex items-center gap-2 text-surface-danger-fg font-medium text-sm mb-2">
                  <XCircle className="w-5 h-5" />
                  Import failed — nothing was imported
                </div>
                <pre className="text-xs text-surface-danger-fg whitespace-pre-wrap font-sans">{importResult.error}</pre>
              </div>
            )}
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
                      <code className="font-mono text-xs bg-background px-2 py-0.5 rounded border min-w-[180px] flex-shrink-0">
                        {header}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </code>
                      <span className="text-muted-foreground">{field.description}</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-4 space-y-1">
                <p>* Required on every row.</p>
                <p><strong>Multiple properties:</strong> one row per property — repeat the client&apos;s details on each row and they&apos;ll be grouped into one client.</p>
                <p>Rows matching an existing client (same name + phone or email) are skipped as duplicates.</p>
                <p>Any row error aborts the whole import — nothing is partially imported.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
