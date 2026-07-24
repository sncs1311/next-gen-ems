'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { StatusBadge, AssetCode, LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const STATUSES = ['Active', 'Idle', 'Under Maintenance', 'In Transit', 'Decommissioned', 'Written Off'];
const CAN_CREATE = ['FLEET_MGR', 'SYS_ADMIN'];

export default function AssetsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', status: '', page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      params.set('page', filters.page);
      params.set('pageSize', 25);
      const { data } = await api.get(`/assets?${params}`);
      return data;
    },
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Asset Registry</h1>
        {CAN_CREATE.includes(user?.role) && (
          <button className="btn-primary" onClick={() => router.push('/assets/new')}>
            + Register Asset
          </button>
        )}
      </div>

      {/* Filters */}
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

      {/* Table */}
      <div className="card">
        {isLoading ? <LoadingSpinner /> : error ? <div className="p-4"><ErrorMessage message={error.message} /></div> : (
          <>
            {data?.results?.length === 0 ? (
              <EmptyState title="No assets found" description="Try adjusting your filters or register a new asset."
                action={CAN_CREATE.includes(user?.role) && <button className="btn-primary" onClick={() => router.push('/assets/new')}>Register first asset</button>} />
            ) : (
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Asset No.</th>
                    <th>Make / Model</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Ownership</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((asset) => (
                    <tr key={asset.id} className="cursor-pointer" onClick={() => router.push(`/assets/${asset.id}`)}>
                      <td><AssetCode code={asset.assetNumber} /></td>
                      <td className="font-medium">{asset.make} {asset.model} <span className="text-slate-400">({asset.yearOfManufacture})</span></td>
                      <td className="text-slate-500">{asset.subType?.category?.categoryName ?? '—'}</td>
                      <td><StatusBadge status={asset.currentStatus} /></td>
                      <td className="text-slate-500">{asset.ownershipType}</td>
                      <td className="text-right">
                        <button className="text-amber-500 hover:underline text-sm" onClick={(e) => { e.stopPropagation(); router.push(`/assets/${asset.id}`); }}>
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
