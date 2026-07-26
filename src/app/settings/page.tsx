import { NavRail } from '@/components/shared'
import { GeneralSettings } from './general-settings'
import { CsvImportExport } from './csv-import-export'
import { LeadIngestion } from './lead-ingestion'

export const metadata = { title: 'Settings — Aurora CRM' }

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-semibold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your Aurora CRM workspace</p>
          </div>
          <div className="space-y-6">
            <GeneralSettings />
            <CsvImportExport />
            <LeadIngestion />
          </div>
        </div>
      </main>
    </div>
  )
}
