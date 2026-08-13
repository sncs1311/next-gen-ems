'use client';
// frontend/src/app/analytics/page.jsx
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage, StatCard } from '@/components/ui';
import api from '@/lib/api';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

function Section({ title, children, action }) {
  return (
    <div className="card mb-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();

  const { data: stats, isLoading: sl } = useQuery({
    queryKey: ['fleet-stats'], queryFn: async () => { const { data } = await api.get('/analytics/fleet-stats'); return data; },
  });
  const { data: util } = useQuery({
    queryKey: ['util'], queryFn: async () => { const { data } = await api.get('/analytics/utilization'); return data; },
  });
  const { data: mtbf } = useQuery({
    queryKey: ['mtbf'], queryFn: async () => { const { data } = await api.get('/analytics/mtbf-trend'); return data; },
  });
  const { data: fuelData } = useQuery({
    queryKey: ['fuel-proj'], queryFn: async () => { const { data } = await api.get('/analytics/fuel-by-project'); return data; },
  });
  const { data: maintTrend } = useQuery({
    queryKey: ['maint-trend'], queryFn: async () => { const { data } = await api.get('/analytics/maintenance-trend'); return data; },
  });
  const { data: tco } = useQuery({
    queryKey: ['tco'], queryFn: async () => { const { data } = await api.get('/analytics/tco'); return data; },
  });
  const { data: incidents } = useQuery({
    queryKey: ['inc-stats'], queryFn: async () => { const { data } = await api.get('/analytics/incident-stats'); return data; },
  });

  const PROJECT_COLORS = ['#111','#555','#888','#aaa','#ccc'];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/analytics/expiry')}>Expiry Alerts</button>
          <button className="btn-secondary" onClick={() => router.push('/analytics/service-due')}>Assets Due</button>
        </div>
      </div>

      {/* FR-AD-001 — Fleet KPI Summary */}
      {sl ? <LoadingSpinner /> : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Assets" value={stats.totalAssets} sub={`${stats.active} active`} />
          <StatCard label="Fleet Utilization" value={`${stats.utilizationRate}%`} sub="Average across fleet" />
          <StatCard label="MTBF" value={`${stats.mtbf}h`} sub="Mean time between failures" />
          <StatCard label="MTTR" value={`${stats.mttr}h`} sub="Mean time to repair" />
          <StatCard label="Under Maintenance" value={stats.underMaintenance} sub="Currently in workshop" />
          <StatCard label="In Transit" value={stats.inTransit} sub="Being transferred" />
          <StatCard label="Fuel This Month" value={`${stats.fuelThisMonthLiters?.toLocaleString()} L`} sub={`QAR ${stats.fuelThisMonthCost?.toLocaleString()}`} />
          <StatCard label="Maintenance This Month" value={`QAR ${stats.maintenanceCostThisMonth?.toLocaleString()}`} sub="Parts + labor" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FR-AD-002 — Utilization by Project */}
        <Section title="Fleet Utilization by Project">
          {util ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={util} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="projectCode" tick={{ fontSize: 11 }} />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="utilizationRate" fill="#111" radius={[3,3,0,0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          ) : <LoadingSpinner />}
        </Section>

        {/* FR-AD-003 — MTTR Trend */}
        <Section title="MTTR Trend — Workshop Efficiency (hours)">
          {mtbf ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mtbf} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mttr" stroke="#111" strokeWidth={2} dot={false} name="MTTR (h)" />
                <Line type="monotone" dataKey="breakdowns" stroke="#888" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Breakdowns" />
              </LineChart>
            </ResponsiveContainer>
          ) : <LoadingSpinner />}
        </Section>

        {/* FR-AD-005 — Fuel by Project */}
        <Section title="Fuel Consumption by Project (litres)">
          {fuelData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fuelData.data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {fuelData.projects.map((p, i) => (
                  <Bar key={p.id} dataKey={p.code} stackId="a" fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} name={p.code} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : <LoadingSpinner />}
        </Section>

        {/* FR-AD-006 — Maintenance Cost Trend */}
        <Section title="Maintenance Cost Trend — Preventive vs Corrective (QAR)">
          {maintTrend ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={maintTrend} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `QAR ${v.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="preventive" stackId="1" stroke="#888" fill="#e5e5e5" name="Preventive" />
                <Area type="monotone" dataKey="corrective" stackId="1" stroke="#111" fill="#111" fillOpacity={0.6} name="Corrective" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <LoadingSpinner />}
        </Section>
      </div>

      {/* FR-AD-004 — Top TCO Assets */}
      <Section title="Top 10 Assets by Total Cost of Ownership">
        {tco ? (
          <table className="table-base">
            <thead>
              <tr><th>Asset</th><th>Make / Model</th><th>Category</th><th>Fuel Cost</th><th>Maint Cost</th><th>Total TCO</th></tr>
            </thead>
            <tbody>
              {tco.map((a, i) => (
                <tr key={i}>
                  <td><span className="font-mono text-sm">{a.assetNumber}</span></td>
                  <td className="font-medium">{a.make} {a.model}</td>
                  <td className="text-gray-500">{a.category}</td>
                  <td className="text-gray-500">QAR {a.totalFuelCost.toLocaleString()}</td>
                  <td className="text-gray-500">QAR {a.totalMaintenanceCost.toLocaleString()}</td>
                  <td className="font-semibold">QAR {a.tco.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <LoadingSpinner />}
      </Section>

      {/* Incident summary */}
      {incidents && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Incidents" value={incidents.total} sub="All time" />
          <StatCard label="Open Investigations" value={incidents.open} sub="Pending closure" />
          <div className="card p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">By Type</div>
            <div className="space-y-1">
              {incidents.byType?.map((t) => (
                <div key={t.incidentType} className="flex justify-between text-sm">
                  <span className="text-gray-600">{t.incidentType}</span>
                  <span className="font-semibold">{t._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}