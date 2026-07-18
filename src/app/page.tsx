import { Suspense } from 'react'
import { getDashboardMetrics } from '@/lib/data/queries'
import { MetricCard, StageBreakdown } from '@/components/dashboard/metric-cards'
import { AuroraArcStepper } from '@/components/shared'
import { NavRail } from '@/components/shared/NavRail'
import { Toaster } from '@/components/shared/toaster'
import { DollarSign, Users, AlertTriangle, CheckCircle, Clock, Target, TrendingUp, Home } from 'lucide-react'

async function DashboardMetrics() {
  const metrics = await getDashboardMetrics()
  return metrics
}

export default async function DashboardPage() {
  const metrics = await DashboardMetrics()

  const stageData = [
    { stage: 'consultation', count: 0, label: 'Consultation', color: '#3B82F6' },
    { stage: 'exit_plan', count: 0, label: 'Exit Plan', color: '#8B5CF6' },
    { stage: 'in_progress', count: 0, label: 'In Progress', color: '#F59E0B' },
    { stage: 'resolved', count: 0, label: 'Resolved', color: '#10B981' },
  ]

  return (
    <div className="flex h-screen bg-background">
      <NavRail />
      <main className="flex-1 ml-64 overflow-auto transition-all duration-200 lg:ml-64">
        <Toaster />
        
        <div className="container mx-auto px-4 py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-semibold tracking-tight">Overview Dashboard</h1>
            <p className="text-muted-foreground mt-1">Portfolio-level metrics and case pipeline overview</p>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Total Cases"
              value={metrics.total_cases}
              icon={<Users className="w-6 h-6 text-primary" />}
              href="/clients"
              color="primary"
            />
            <MetricCard
              title="Active Cases"
              value={metrics.active_cases}
              icon={<Target className="w-6 h-6 text-amber-500" />}
              href="/clients?health=at-risk"
              color="warning"
            />
            <MetricCard
              title="At Risk"
              value={metrics.at_risk_cases}
              icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
              href="/clients?health=at_risk"
              color="danger"
            />
            <MetricCard
              title="Resolved"
              value={metrics.resolved_cases}
              icon={<CheckCircle className="w-6 h-6 text-green-500" />}
              href="/clients?stage=resolved"
              color="success"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Debt Eliminated"
              value={`$${Number(metrics.total_debt_eliminated).toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6 text-green-500" />}
              color="success"
              description="Across all resolved properties"
            />
            <MetricCard
              title="Properties Under Mgmt"
              value={metrics.properties_under_mgmt}
              icon={<Home className="w-6 h-6 text-blue-500" />}
              color="info"
            />
            <MetricCard
              title="Avg Time to Resolution"
              value={metrics.avg_time_to_resolution ? `${Math.round(Number(metrics.avg_time_to_resolution) / (1000 * 60 * 60 * 24))} days` : '—'}
              icon={<Clock className="w-6 h-6 text-purple-500" />}
              color="primary"
            />
            <MetricCard
              title="Resolution Rate"
              value={`${metrics.resolution_rate.toFixed(1)}%`}
              icon={<TrendingUp className="w-6 h-6 text-emerald-500" />}
              color="success"
            />
          </div>

          {/* Pipeline Stage Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <StageBreakdown stages={stageData} total={metrics.total_cases} />
            </div>
            <div>
              <div className="p-5 rounded-xl border bg-card">
                <h3 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <a href="/clients" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                    <p className="font-medium">Add New Client</p>
                    <p className="text-sm text-muted-foreground">Start a new case</p>
                  </a>
                  <a href="/tasks" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                    <p className="font-medium">View Tasks</p>
                    <p className="text-sm text-muted-foreground">Manage follow-ups</p>
                  </a>
                  <a href="/clients?health=at_risk" className="block p-3 rounded-lg border hover:bg-accent transition-colors">
                    <p className="font-medium">Review At-Risk Cases</p>
                    <p className="text-sm text-muted-foreground">{metrics.at_risk_cases} cases need attention</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}