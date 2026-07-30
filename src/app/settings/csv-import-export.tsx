'use client'

import { useState, useRef, useCallback } from 'react'
import { exportClientsCsv, importClientsFromCsv } from '@/lib/data/settings-actions'
import { toast } from 'sonner'
import { Download, Upload, FileText, Loader2, CheckCircle, XCircle, AlertTriangle, Eye, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

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

const EXAMPLE_CSV_ROWS: Record<string, string>[] = [
  // Client 1 with 2 properties (same name+phone → grouped)
  {
    name: 'John Smith',
    phone: '555-123-4567',
    email: 'john@email.com',
    state: 'FL',
    zip: '33101',
    stage: 'consultation',
    case_opened_at: '2024-01-15',
    tags: 'VIP; Referral',
    co_client_name: 'Jane Smith',
    dob: '1970-05-20',
    ssn_last4: '1234',
    address: '123 Main St, Miami',
    phone2: '555-987-6543',
    retainer_fee: '3500',
    resort_name: 'Ocean Breeze Resort',
    resort_location: 'Miami Beach, FL',
    unit_number: '12A',
    purchase_price: '45000',
    loan_balance: '38000',
    maintenance_fee: '1200',
    fee_due_date: '2025-01-01',
    document_reference: 'https://drive.com/contract1',
    usage_frequency: 'annual',
    usage_type: 'fixed_week',
    fees_current: 'true',
    fees_behind_amount: '0',
    maintenance_fees_billed: '12000',
  },
  {
    name: 'John Smith',
    phone: '555-123-4567',
    email: 'john@email.com',
    state: 'FL',
    zip: '33101',
    stage: 'consultation',
    case_opened_at: '2024-01-15',
    tags: 'VIP; Referral',
    co_client_name: 'Jane Smith',
    dob: '1970-05-20',
    ssn_last4: '1234',
    address: '123 Main St, Miami',
    phone2: '555-987-6543',
    retainer_fee: '3500',
    resort_name: 'Sunset Timeshare',
    resort_location: 'Orlando, FL',
    unit_number: '5B',
    purchase_price: '32000',
    loan_balance: '28000',
    maintenance_fee: '950',
    fee_due_date: '2025-03-01',
    document_reference: 'https://drive.com/contract2',
    usage_frequency: 'biennial',
    usage_type: 'floating_week',
    fees_current: 'true',
    fees_behind_amount: '0',
    maintenance_fees_billed: '9500',
  },
  // Client 2 - no properties
  {
    name: 'Maria Garcia',
    phone: '555-222-3333',
    email: 'maria@email.com',
    state: 'CA',
    zip: '90210',
    stage: 'exit_plan',
    case_opened_at: '2024-03-10',
    tags: '',
    co_client_name: '',
    dob: '1985-12-01',
    ssn_last4: '5678',
    address: '456 Oak Ave, LA',
    phone2: '',
    retainer_fee: '2500',
    resort_name: '',
    resort_location: '',
    unit_number: '',
    purchase_price: '',
    loan_balance: '',
    maintenance_fee: '',
    fee_due_date: '',
    document_reference: '',
    usage_frequency: '',
    usage_type: '',
    fees_current: '',
    fees_behind_amount: '',
    maintenance_fees_billed: '',
  },
]

type ImportResult =
  | { success: true; imported: number; properties: number; duplicates: number; warnings: string[] }
  | { success: false; error: string }

function ExampleCsvTab() {
  const csvContent = [
    CSV_TEMPLATE_HEADERS.join(','),
    ...EXAMPLE_CSV_ROWS.map((r) =>
      CSV_TEMPLATE_HEADERS.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Below is a ready-to-use example with <strong>2 clients</strong> — John Smith has <strong>2 properties</strong> (same name + phone groups them), Maria Garcia has none. Copy or reference the column order.
      </p>

      <div className="rounded-lg border bg-muted/30 p-4 max-h-96 overflow-auto">
        <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground">{csvContent}</pre>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <h4 className="text-sm font-semibold">Key Rules</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li><strong>Required on every row:</strong> name, phone, email, state, zip</li>
          <li><strong>Multiple properties:</strong> repeat the client&apos;s details on each row (same name + phone) → they&apos;ll be grouped into one client</li>
          <li><strong>Duplicates:</strong> rows matching an existing client (same name + phone or email) are skipped</li>
          <li><strong>All-or-nothing:</strong> any row error aborts the whole import — nothing is partially imported</li>
          <li><strong>Dates:</strong> accept YYYY-MM-DD or M/D/YYYY (Excel default)</li>
          <li><strong>Money:</strong> $45,000.00 or 45000 both work</li>
          <li><strong>Enums:</strong> usage_frequency = annual|biennial|odd_year|even_year; usage_type = fixed_week|floating_week|points_based</li>
        </ul>
      </div>
    </div>
  )
}

function FieldReferenceTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Complete field reference matching the <strong>Add Client</strong> and <strong>Add Property</strong> forms.
      </p>

      <div className="rounded-lg border bg-muted/30 p-4 max-h-96 overflow-auto">
        <div className="space-y-2">
          {CSV_TEMPLATE_HEADERS.map((header) => {
            const field = FIELD_DESCRIPTIONS[header]
            return (
              <div key={header} className="flex items-start gap-3 text-sm">
                <code className={cn(
                  'font-mono text-xs bg-background px-2 py-0.5 rounded border min-w-[180px] flex-shrink-0',
                  field.required && 'border-red-200 bg-red-50'
                )}>
                  {header}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </code>
                <span className="text-muted-foreground">{field.description}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>* Required on every row.</p>
        <p><strong>Multiple properties:</strong> one row per property — repeat the client&apos;s details on each row and they&apos;ll be grouped into one client.</p>
        <p>Rows matching an existing client (same name + phone or email) are skipped as duplicates.</p>
        <p>Any row error aborts the whole import — nothing is partially imported.</p>
      </div>
    </div>
  )
}

function SeeHowDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<'example' | 'reference'>('example')

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 isolate flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10"
            role="dialog"
            aria-modal="true"
            aria-label="CSV Import — See How It Works"
          >
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <h2 className="text-base font-heading font-medium">CSV Import — See How It Works</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Two tabs: an annotated example CSV and the complete field reference.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setActiveTab('example')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  activeTab === 'example'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Eye className="w-4 h-4" />
                Example CSV
              </button>
              <button
                onClick={() => setActiveTab('reference')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  activeTab === 'reference'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileText className="w-4 h-4" />
                Field Reference
              </button>
            </div>

            <div className="mt-4">
              {activeTab === 'example' ? <ExampleCsvTab /> : <FieldReferenceTab />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function CsvImportExport() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showSeeHow, setShowSeeHow] = useState(false)
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
          onClick={() => setShowSeeHow(true)}
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Eye className="w-4 h-4" />
          See How
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

      {/* See How Dialog */}
      <SeeHowDialog open={showSeeHow} onOpenChange={setShowSeeHow} />
    </div>
  )
}