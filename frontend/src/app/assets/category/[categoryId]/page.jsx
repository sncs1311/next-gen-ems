'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { StatusBadge, AssetCode, LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import api from '@/lib/api';

const STATUSES = ['Active', 'Idle', 'Under Maintenance', 'In Transit', 'Decommissioned', 'Written Off'];

export default function AssetCategoryListPage() {
  const { categoryId } = useParams();
  const router = useRouter();
  const [filters, setFilters] = useState({ q: '', status: '', page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'category', categoryId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('categoryId', categoryId);
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      params.set('page', filters.page);
      params.set('pageSize', 25);
      const { data } = await api.get(`/assets?${params}`);
      return data;
    },
  });

  // First result's category name, for the header — falls back while loading
  const categoryName = data?.results?.[0]?.subType?.category?.categoryName ?? '…';

  return (
    <AppShell>
      <button onClick={() => router.push('/assets')} className="text-slate-400 text-sm mb-3">← Back to Categories</button>
      <div className="page-header">
        <h1 className="page-title">{categoryName}</h1>
      </div>

      <div className="card mb-4 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by number, make, model…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
          className="form-input max-w-xs"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          className="form-select w-48"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? <LoadingSpinner /> : error ? <div className="p-4"><ErrorMessage message={error.message} /></div> : (
          <>
            {data?.results?.length === 0 ? (
              <EmptyState title="No assets in this category" description="Try adjusting your filters." />
            ) : (
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Asset No.</th><th>Make / Model</th><th>Status</th><th>Ownership</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((asset) => (
                    // FIXED: routes by assetNumber, not asset.id (UUID) —
                    // matches the new /assets/[assetNumber] detail page.
                    <tr key={asset.id} className="cursor-pointer" onClick={() => router.push(`/assets/${asset.assetNumber}`)}>
                      <td><AssetCode code={asset.assetNumber} /></td>
                      <td className="font-medium">{asset.make} {asset.model} <span className="text-slate-400">({asset.yearOfManufacture})</span></td>
                      <td><StatusBadge status={asset.currentStatus} /></td>
                      <td className="text-slate-500">{asset.ownershipType}</td>
                      <td className="text-right">
                        <button className="text-gray-900 hover:underline text-sm" onClick={(e) => { e.stopPropagation(); router.push(`/assets/${asset.assetNumber}`); }}>
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pagination page={filters.page} pageSize={25} total={data?.total ?? 0} onPage={(p) => setFilters({ ...filters, page: p })} />
          </>
        )}
      </div>
    </AppShell>
  );
}