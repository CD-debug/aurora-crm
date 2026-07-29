import { NavRail, PageHeader } from '@/components/shared'
import { GeneralSettings } from './general-settings'
import { TeamMembers } from './team-members'
import { CsvImportExport } from './csv-import-export'

export const metadata = { title: 'Settings — Aurora CRM' }

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-16 overflow-auto">
        <PageHeader
          title="Settings"
          subtitle="Configure your Aurora CRM workspace."
          breadcrumb={[{ label: 'Settings' }]}
        />
        <div className="container mx-auto px-4 py-6 space-y-6">
          <GeneralSettings />
          <TeamMembers />
          <CsvImportExport />
        </div>
      </main>
    </div>
  )
}
