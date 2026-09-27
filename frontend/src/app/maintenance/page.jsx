'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { AssetCode, LoadingSpinner, ErrorMessage, EmptyState } from '@/components/ui';
import AssetLookup from '@/components/ui/AssetLookup';
import api from '@/lib/api';

const STATUS_COLORS = {
  Open: 'badge-active', 'In Progress': 'badge-transit', 'Parts Pending': 'badge-maintenance',
  'Completed Pending Approval': 'badge-maintenance', Closed: 'badge-idle',
};

export default function MaintenancePage() {
  const router = useRouter();
  const [assetId, setAssetId] = useState('');
  const [searched, setSearched] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['job-cards', searched],
    queryFn: async () => { const { data } = await api.get(`/maintenance/job-cards/asset/${searched}`); return data; },
    enabled: !!searched,
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Maintenance</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => router.push('/maintenance/breakdown/new')}>Report Breakdown</button>
          <button className="btn-primary" onClick={() => router.push('/maintenance/job-cards/new')}>+ New Job Card</button>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <label className="form-label">Asset</label>
        {/* FIXED: was a raw "paste asset UUID" text input — same root cause
            as the fuel list page's 422s. AssetLookup resolves the asset
            number you type directly to its UUID and searches immediately
            on selection. */}
        <AssetLookup
          value={assetId}
          onChange={(id) => { setAssetId(id); setSearched(id); }}
        />
      </div>

      <div className="card">
        {!searched ? (
          <EmptyState title="Search by Asset" description="Type an asset number above to view its job card history." />
        ) : isLoading ? <LoadingSpinner />
        : error ? <div className="p-4"><ErrorMessage message={error.message} /></div>
        : !data?.length ? <EmptyState title="No job cards found" description="No maintenance records for this asset." action={<button className="btn-primary" onClick={() => router.push('/maintenance/job-cards/new')}>Create first job card</button>} />
        : (
          <table className="table-base">
            <thead><tr><th>Job Card No.</th><th>Type</th><th>Fault / Service</th><th>Opened</th><th>Status</th><th>Total Cost</th></tr></thead>
            <tbody>
              {data.map((jc) => (
                <tr key={jc.id}>
                  <td><AssetCode code={jc.jobCardNumber} /></td>
                  <td className="text-slate-500">{jc.jobCardType}</td>
                  <td className="font-medium">{jc.faultDescription || jc.serviceType || '—'}</td>
                  <td className="text-slate-500">{new Date(jc.openedAt).toLocaleDateString()}</td>
                  <td><span className={STATUS_COLORS[jc.status] || 'badge-idle'}>{jc.status}</span></td>
                  <td className="text-slate-500">{jc.totalCost ? Number(jc.totalCost).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}