import { NavRail, Breadcrumb } from '@/components/shared'
import { GeneralSettings } from './general-settings'
import { CsvImportExport } from './csv-import-export'
import { LeadIngestion } from './lead-ingestion'

export const metadata = { title: 'Settings — Aurora CRM' }

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
          <div className="container mx-auto px-4 py-3">
            <Breadcrumb items={[{ label: 'Settings' }]} className="mb-1" />
            <h1 className="text-2xl font-heading font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure your Aurora CRM workspace.</p>
          </div>
        </header>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <GeneralSettings />
          <CsvImportExport />
          <LeadIngestion />
        </div>
      </main>
    </div>
  )
}
