'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import api from '@/lib/api';

const TYPE_COLORS = {
  'Near Miss': 'badge-maintenance', 'Minor Accident': 'badge-maintenance',
  'Major Accident': 'badge-decommissioned', 'Personal Injury': 'badge-decommissioned',
  'Fire': 'badge-decommissioned', 'Equipment Tip-Over': 'badge-decommissioned',
};
const STATUSES = ['Open', 'Under Investigation', 'Closed'];

export default function IncidentsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ status: '', incidentType: '', page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['incidents', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: filters.page });
      if (filters.status) params.set('status', filters.status);
      if (filters.incidentType) params.set('incidentType', filters.incidentType);
      const { data } = await api.get(`/incidents?${params}`);
      return data;
    },
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Incident Reports</h1>
        <button className="btn-danger" onClick={() => router.push('/incidents/new')}>+ File Report</button>
      </div>

      <div className="card mb-4 p-4 flex flex-wrap gap-3">
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} className="form-select w-48">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.incidentType} onChange={(e) => setFilters({ ...filters, incidentType: e.target.value, page: 1 })} className="form-select w-52">
          <option value="">All types</option>
          {['Near Miss','Minor Accident','Major Accident','Fire','Equipment Tip-Over','Falling Object','Third-Party Property Damage','Personal Injury'].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? <LoadingSpinner /> : error ? <div className="p-4"><ErrorMessage message={error.message} /></div> : (
          <>
            {!data?.results?.length
              ? <EmptyState title="No incidents recorded" description="File a report using the button above." />
              : (
                <table className="table-base">
                  <thead><tr><th>Incident No.</th><th>Type</th><th>Asset</th><th>Date</th><th>Status</th><th>Police Report</th></tr></thead>
                  <tbody>
                    {data.results.map((inc) => (
                      <tr key={inc.id} className="cursor-pointer" onClick={() => router.push(`/incidents/${inc.id}`)}>
                        <td><span className="font-mono text-sm">{inc.incidentNumber}</span></td>
                        <td><span className={TYPE_COLORS[inc.incidentType] || 'badge-idle'}>{inc.incidentType}</span></td>
                        <td className="text-slate-500">{inc.asset?.assetNumber ?? '—'}</td>
                        <td className="text-slate-500">{new Date(inc.occurredAt).toLocaleDateString()}</td>
                        <td><span className={inc.incidentStatus === 'Closed' ? 'badge-idle' : 'badge-maintenance'}>{inc.incidentStatus}</span></td>
                        <td className="text-slate-400">{inc.policeReportNumber || '—'}</td>
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
