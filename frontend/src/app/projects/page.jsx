'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { AssetCode, LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const STATUSES = ['Mobilization', 'Active', 'On Hold', 'Demobilization', 'Completed'];
const STATUS_COLORS = {
  Active: 'badge-active', Mobilization: 'badge-transit', 'On Hold': 'badge-maintenance',
  Demobilization: 'badge-idle', Completed: 'badge-idle',
};
const CAN_CREATE = ['FLEET_MGR', 'SYS_ADMIN'];

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', status: '', page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: filters.page });
      if (filters.q) params.set('q', filters.q);
      if (filters.status) params.set('status', filters.status);
      const { data } = await api.get(`/projects?${params}`);
      return data;
    },
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        {CAN_CREATE.includes(user?.role) && (
          <button className="btn-primary" onClick={() => router.push('/projects/new')}>+ New Project</button>
        )}
      </div>

      <div className="card mb-4 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search by code, name, client…" value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} className="form-input max-w-xs" />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })} className="form-select w-44">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {isLoading ? <LoadingSpinner /> : error ? <div className="p-4"><ErrorMessage message={error.message} /></div> : (
          <>
            {!data?.results?.length
              ? <EmptyState title="No projects found" description="Register a project to get started." />
              : (
                <table className="table-base">
                  <thead><tr><th>Code</th><th>Project Name</th><th>Client</th><th>Location</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {data.results.map((p) => (
                      <tr key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                        <td><AssetCode code={p.projectCode} /></td>
                        <td className="font-medium">{p.projectName}</td>
                        <td className="text-slate-500">{p.clientName}</td>
                        <td className="text-slate-500">{p.city}, {p.country}</td>
                        <td><span className={STATUS_COLORS[p.projectStatus] || 'badge-idle'}>{p.projectStatus}</span></td>
                        <td className="text-right"><button className="text-gray-900 hover:underline text-sm">View →</button></td>
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
