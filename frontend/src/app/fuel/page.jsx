'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { AssetCode, LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import api from '@/lib/api';

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

      <div className="card mb-4 p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="form-label">Asset ID</label>
          <input className="form-input font-mono" placeholder="Paste asset UUID to view its fuel history…"
            value={filters.assetId} onChange={(e) => setFilters({ assetId: e.target.value, page: 1 })} />
        </div>
      </div>

      <div className="card">
        {!filters.assetId ? (
          <EmptyState title="Enter an Asset ID above" description="Fuel logs are stored per asset. Paste a UUID to view history." />
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
