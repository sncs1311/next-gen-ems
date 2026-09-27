'use client';
// frontend/src/app/intelligence/fuel-forecast/page.jsx
import { useQuery, useMutation } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, AssetCode } from '@/components/ui';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FuelForecastPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fuel-forecasts'],
    queryFn: async () => { const { data } = await api.get('/intelligence/fuel-forecasts'); return data; },
    retry: false,
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/intelligence/run/fuel'),
    onSuccess: () => refetch(),
  });

  const chartData = (data || []).map((f) => ({
    project: f.project?.projectCode ?? '—',
    '7-day forecast': Math.round(f.forecast7dLiters),
    '30-day forecast': Math.round(f.forecast30dLiters),
  }));

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fuel Consumption Forecast</h1>
          <p className="text-gray-400 text-sm mt-1">FR-IL-003 — XGBoost regression per project site</p>
        </div>
        <button className="btn-secondary" onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
          {triggerMutation.isPending ? 'Running…' : '↻ Refresh Forecast'}
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : error || !data?.length ? (
        <div className="card p-10 text-center text-gray-400">
          No forecasts yet. Start the ML service and click Refresh Forecast.
        </div>
      ) : (
        <>
          <div className="card p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Forecast by Project</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="project" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" L" />
                <Tooltip formatter={(v) => `${v.toLocaleString()} L`} />
                <Legend />
                <Bar dataKey="7-day forecast" fill="#111" radius={[3,3,0,0]} />
                <Bar dataKey="30-day forecast" fill="#888" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Forecast Details</h2>
            </div>
            <table className="table-base">
              <thead>
                <tr><th>Project</th><th>Location</th><th>7-Day Forecast</th><th>30-Day Forecast</th><th>Computed</th></tr>
              </thead>
              <tbody>
                {data.map((f) => (
                  <tr key={f.id}>
                    <td><AssetCode code={f.project?.projectCode} /></td>
                    <td className="text-gray-500">{f.project?.city}, {f.project?.country}</td>
                    <td className="font-semibold">{Number(f.predictedVolumeLiters).toLocaleString()} L</td>
                    <td className="text-gray-400 text-sm">{f.forecastPeriodEnd ? new Date(f.forecastPeriodEnd).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}