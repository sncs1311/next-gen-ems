'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppShell from '@/components/layout/AppShell';
import { AssetCode, LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import AssetLookup from '@/components/ui/AssetLookup';
import api from '@/lib/api';

// Distinct colors per pie slice — cycles if there are more categories than colors.
const SLICE_COLORS = ['#1f2937', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d'];

function StatBox({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// NEW — analytics section: total spend, total litres, avg price/litre, and a
// pie chart of litres consumed per asset category. Backed by GET /fuel/summary,
// which is already project-scoped server-side (Fleet Manager/Site Engineer see
// only their site's fuel data; Finance/Exec/Sys Admin see everything) — this
// component doesn't need to know or care which case it's in.
function FuelAnalytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['fuel-summary'],
    queryFn: async () => {
      const { data } = await api.get('/fuel/summary');
      return data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="card p-8 mb-4">
        <LoadingSpinner />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card p-4 mb-4">
        <ErrorMessage message={error.response?.data?.error || 'Could not load fuel analytics'} />
      </div>
    );
  }
  if (!data || data.totalLiters === 0) {
    return (
      <div className="card p-8 mb-4">
        <EmptyState title="No fuel data yet" description="Analytics will appear once fuel logs are recorded." />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatBox label="Total Fuel Cost" value={`${data.totalCost.toLocaleString()}`} sub="All logged fuel" />
        <StatBox label="Total Litres" value={data.totalLiters.toLocaleString()} sub="L dispensed" />
        <StatBox
          label="Avg Price / Litre"
          value={data.avgPricePerLiter != null ? data.avgPricePerLiter.toFixed(3) : '—'}
          sub="Weighted average"
        />
      </div>

      {data.byCategory.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Fuel Consumption by Asset Category</h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-72 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byCategory}
                    dataKey="liters"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${Math.round((entry.liters / data.totalLiters) * 100)}%`}
                  >
                    {data.byCategory.map((entry, i) => (
                      <Cell key={entry.categoryId} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value.toLocaleString()} L`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 w-full">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Litres</th>
                    <th>Cost</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((cat, i) => (
                    <tr key={cat.categoryId}>
                      <td className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                        />
                        {cat.categoryName}
                      </td>
                      <td className="font-medium">{cat.liters.toLocaleString()}</td>
                      <td className="text-slate-500">{cat.cost.toLocaleString()}</td>
                      <td className="text-slate-500">{Math.round((cat.liters / data.totalLiters) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FuelPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ assetId: '', page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['fuel-logs', filters],
    queryFn: async () => {
      if (filters.assetId) {
        const { data } = await api.get(`/fuel/logs/asset/${filters.assetId}?page=${filters.page}`);
        return { results: data, total: data.length };
      }
      return { results: [], total: 0 };
    },
    enabled: !!filters.assetId,
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Fuel Management</h1>
        <button className="btn-primary" onClick={() => router.push('/fuel/new')}>+ Log Fuel Entry</button>
      </div>

      <FuelAnalytics />

      <div className="card mb-4 p-4">
        <label className="form-label">Asset</label>
        <AssetLookup
          value={filters.assetId}
          onChange={(id) => setFilters({ assetId: id, page: 1 })}
        />
      </div>

      <div className="card">
        {!filters.assetId ? (
          <EmptyState title="Search for an asset above" description="Fuel logs are stored per asset. Type an asset number to view history." />
        ) : isLoading ? <LoadingSpinner />
        : error ? <div className="p-4"><ErrorMessage message={error.message} /></div>
        : !data?.results?.length ? <EmptyState title="No fuel logs found" description="No entries for this asset yet." action={<button className="btn-primary" onClick={() => router.push('/fuel/new')}>Log first entry</button>} />
        : (
          <>
            <table className="table-base">
              <thead><tr><th>Date</th><th>Qty (L)</th><th>Fuel Type</th><th>Source</th><th>Efficiency</th><th>Cost</th><th>Anomaly</th></tr></thead>
              <tbody>
                {data.results.map((log) => (
                  <tr key={log.id}>
                    <td className="text-slate-500">{new Date(log.loggedAt).toLocaleDateString()}</td>
                    <td className="font-medium">{Number(log.quantityLiters).toFixed(1)}</td>
                    <td className="text-slate-500">{log.fuelType}</td>
                    <td className="text-slate-500">{log.fuelSource}</td>
                    <td className="text-slate-500">{log.calculatedEfficiency ? Number(log.calculatedEfficiency).toFixed(2) : '—'}</td>
                    <td className="text-slate-500">{log.totalCost ? `${Number(log.totalCost).toFixed(2)}` : '—'}</td>
                    <td>{log.fuelAnomalyFuelLogId ? <span className="badge-maintenance">⚠ Anomaly</span> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={filters.page} pageSize={50} total={data.total} onPage={(p) => setFilters({ ...filters, page: p })} />
          </>
        )}
      </div>
    </AppShell>
  );
}