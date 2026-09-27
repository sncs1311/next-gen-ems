'use client';
// frontend/src/app/intelligence/page.jsx — Intelligence Hub with sub-nav
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, AssetCode, RiskBadge } from '@/components/ui';
import api from '@/lib/api';

const RISK_STYLES = {
  High:   'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Low:    'bg-green-100 text-green-800 border border-green-200',
};

function ScoreBar({ score }) {
  const pct = Math.min(Number(score) || 0, 100);
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-mono w-10 text-right">{Math.round(pct)}</span>
    </div>
  );
}

export default function IntelligencePage() {
  const router = useRouter();
  const [tab, setTab] = useState('maintenance');

  const { data: mlHealth } = useQuery({
    queryKey: ['ml-health'],
    queryFn: async () => { const { data } = await api.get('/intelligence/health'); return data; },
    retry: false,
  });

  const { data: pmScores, isLoading: pmLoading, refetch: pmRefetch } = useQuery({
    queryKey: ['predictive-scores'],
    queryFn: async () => { const { data } = await api.get('/intelligence/predictive-scores'); return data; },
    retry: false,
  });

  const { data: fuelForecasts, isLoading: fuelLoading, refetch: fuelRefetch } = useQuery({
    queryKey: ['fuel-forecasts'],
    queryFn: async () => { const { data } = await api.get('/intelligence/fuel-forecasts'); return data; },
    retry: false,
  });

  const { data: driverRankings, isLoading: driverLoading, refetch: driverRefetch } = useQuery({
    queryKey: ['driver-rankings'],
    queryFn: async () => { const { data } = await api.get('/intelligence/driver-rankings'); return data; },
    retry: false,
  });

  const pmTrigger     = useMutation({ mutationFn: () => api.post('/intelligence/run/maintenance'), onSuccess: () => pmRefetch() });
  const fuelTrigger   = useMutation({ mutationFn: () => api.post('/intelligence/run/fuel'),        onSuccess: () => fuelRefetch() });
  const driverTrigger = useMutation({ mutationFn: () => api.post('/intelligence/run/drivers'),     onSuccess: () => driverRefetch() });

  const TABS = [
    { key: 'maintenance', label: 'Predictive Maintenance' },
    { key: 'fuel',        label: 'Fuel Forecast' },
    { key: 'drivers',     label: 'Driver Rankings' },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Intelligence Layer</h1>
          <p className="text-gray-400 text-sm mt-1">Phase 4 — ML-powered predictive analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {mlHealth && (
            <span className={`text-xs px-2 py-1 rounded border ${mlHealth.status === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              ML Service {mlHealth.status === 'ok' ? '● Online' : '● Offline'}
            </span>
          )}
          <button className="btn-secondary text-sm" onClick={() => router.push('/intelligence/eval-report')}>
            Model Report →
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Predictive Maintenance tab */}
      {tab === 'maintenance' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 font-semibold">{pmScores?.filter(s => s.riskCategory === 'High').length ?? 0} High</span>
              <span className="text-yellow-600 font-semibold">{pmScores?.filter(s => s.riskCategory === 'Medium').length ?? 0} Medium</span>
              <span className="text-green-600 font-semibold">{pmScores?.filter(s => s.riskCategory === 'Low').length ?? 0} Low</span>
            </div>
            <button className="btn-secondary text-sm" onClick={() => pmTrigger.mutate()} disabled={pmTrigger.isPending}>
              {pmTrigger.isPending ? 'Running…' : '↻ Refresh Scores'}
            </button>
          </div>
          <div className="card">
            {pmLoading ? <LoadingSpinner /> : !pmScores?.length ? (
              <div className="p-10 text-center text-gray-400">No scores yet. Start the ML service and click Refresh Scores.</div>
            ) : (
              <table className="table-base">
                <thead><tr><th>Asset</th><th>Make / Model</th><th>Category</th><th>Risk Score</th><th>Risk Level</th><th></th></tr></thead>
                <tbody>
                  {pmScores.map((s) => (
                    <tr key={s.id} className="cursor-pointer" onClick={() => router.push(`/assets/${s.assetId}`)}>
                      <td><AssetCode code={s.asset?.assetNumber} /></td>
                      <td className="font-medium">{s.asset?.make} {s.asset?.model}</td>
                      <td className="text-gray-500 text-sm">{s.asset?.subType?.category?.categoryName ?? '—'}</td>
                      {/* FIXED: was `score={s.riskScore}` — the Prisma field on
                          PredictiveMaintenanceScore is `score`, not `riskScore`.
                          `s.riskScore` was always undefined, so every row rendered 0
                          regardless of the asset's real risk score (e.g. 92.4). */}
                      <td className="w-40"><ScoreBar score={s.score} /></td>
                      <td><span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${RISK_STYLES[s.riskCategory]}`}>{s.riskCategory}</span></td>
                      <td className="text-right"><button className="text-gray-600 hover:underline text-sm">View →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Fuel Forecast tab */}
      {tab === 'fuel' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-secondary text-sm" onClick={() => fuelTrigger.mutate()} disabled={fuelTrigger.isPending}>
              {fuelTrigger.isPending ? 'Running…' : '↻ Refresh Forecast'}
            </button>
          </div>
          <div className="card">
            {fuelLoading ? <LoadingSpinner /> : !fuelForecasts?.length ? (
              <div className="p-10 text-center text-gray-400">No forecasts yet. Start the ML service and click Refresh Forecast.</div>
            ) : (
              <table className="table-base">
                <thead><tr><th>Project</th><th>Location</th><th>7-Day Forecast</th><th>30-Day Forecast</th><th>Computed</th></tr></thead>
                <tbody>
                  {fuelForecasts.map((f) => (
                    <tr key={f.id}>
                      <td><AssetCode code={f.project?.projectCode} /></td>
                      <td className="text-gray-500">{f.project?.city}, {f.project?.country}</td>
                      <td className="font-semibold">{Number(f.forecast7dLiters).toLocaleString()} L</td>
                      <td className="font-semibold">{Number(f.forecast30dLiters).toLocaleString()} L</td>
                      {/* This now works because intelligence.service.js's getFuelForecasts()
                          was fixed to actually set `computedAt` (from generatedAt) on each
                          entry — previously it only set `forecastPeriodEnd`, so this column
                          always rendered "—" no matter what. */}
                      <td className="text-gray-400 text-sm">{f.computedAt ? new Date(f.computedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Driver Rankings tab */}
      {tab === 'drivers' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-secondary text-sm" onClick={() => driverTrigger.mutate()} disabled={driverTrigger.isPending}>
              {driverTrigger.isPending ? 'Scoring…' : '↻ Re-score Drivers'}
            </button>
          </div>
          <div className="card">
            {driverLoading ? <LoadingSpinner /> : !driverRankings?.length ? (
              <div className="p-10 text-center text-gray-400">No scores yet. Start the ML service and click Re-score Drivers.</div>
            ) : (
              <table className="table-base">
                <thead><tr><th>#</th><th>Driver</th><th>Risk</th><th>Composite Score</th><th>Incident</th><th>Fuel</th><th>Compliance</th><th></th></tr></thead>
                <tbody>
                  {driverRankings.map((d, idx) => (
                    <tr key={d.id} className="cursor-pointer" onClick={() => router.push(`/drivers/${d.driverId}`)}>
                      <td className="text-gray-400 text-sm">{idx + 1}</td>
                      <td className="font-medium">{d.driver?.employee?.fullName ?? '—'}</td>
                      <td><RiskBadge risk={d.riskCategory} /></td>
                      <td className="w-36"><ScoreBar score={d.compositeScore} /></td>
                      <td className="text-gray-500 text-sm">{Math.round(Number(d.incidentScore))}</td>
                      <td className="text-gray-500 text-sm">{Math.round(Number(d.fuelScore))}</td>
                      <td className="text-gray-500 text-sm">{Math.round(Number(d.complianceScore))}</td>
                      <td className="text-right"><button className="text-gray-600 hover:underline text-sm">View →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}