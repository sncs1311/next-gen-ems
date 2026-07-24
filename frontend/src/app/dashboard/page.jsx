'use client';
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { StatCard, LoadingSpinner, ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

function useFleetStats() {
  return useQuery({
    queryKey: ['fleet-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/fleet-stats');
      return data;
    },
    // graceful fallback if analytics aren't built yet
    retry: false,
  });
}

function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get('/assets?pageSize=5&status=Under Maintenance');
      return data;
    },
    retry: false,
  });
}

export default function DashboardPage() {
  const stats = useFleetStats();
  const alerts = useAlerts();

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Fleet Dashboard</h1>
        <span className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* KPI cards — FR-AD-001 */}
      {stats.isLoading ? (
        <LoadingSpinner />
      ) : stats.error ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Assets" value="—" sub="Analytics not yet computed" />
          <StatCard label="Fleet Utilization" value="—" sub="Run nightly batch to populate" />
          <StatCard label="MTBF" value="—" sub="Mean Time Between Failures" />
          <StatCard label="MTTR" value="—" sub="Mean Time To Repair" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Assets" value={stats.data?.totalAssets ?? 0} sub="Active in fleet" accent />
          <StatCard label="Fleet Utilization" value={`${stats.data?.utilizationRate ?? 0}%`} sub="This month" />
          <StatCard label="MTBF" value={`${stats.data?.mtbf ?? 0}h`} sub="Mean Time Between Failures" />
          <StatCard label="MTTR" value={`${stats.data?.mttr ?? 0}h`} sub="Mean Time To Repair" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Under Maintenance */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-navy-800">Assets Under Maintenance</h2>
            <a href="/maintenance" className="text-amber-500 text-sm hover:underline">View all →</a>
          </div>
          {alerts.isLoading ? <LoadingSpinner /> : (
            <div className="divide-y divide-slate-100">
              {(alerts.data?.results || []).length === 0 ? (
                <p className="px-5 py-8 text-center text-slate-400 text-sm">No assets currently under maintenance</p>
              ) : (alerts.data?.results || []).map((asset) => (
                <div key={asset.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="asset-code">{asset.assetNumber}</span>
                    <span className="text-slate-500 text-sm ml-2">{asset.make} {asset.model}</span>
                  </div>
                  <span className="badge-maintenance">Maintenance</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-navy-800">Quick Actions</h2>
          </div>
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Register Asset', href: '/assets/new', icon: '＋' },
              { label: 'Register Driver', href: '/drivers/new', icon: '◉' },
              { label: 'Log Fuel Entry', href: '/fuel/new', icon: '⛽' },
              { label: 'Report Breakdown', href: '/maintenance/breakdown/new', icon: '⚠' },
              { label: 'Submit Transfer', href: '/transfers/new', icon: '⇄' },
              { label: 'File Incident', href: '/incidents/new', icon: '⚡' },
            ].map((a) => (
              <a key={a.href} href={a.href}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-sm font-medium text-navy-800">
                <span>{a.icon}</span>{a.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
