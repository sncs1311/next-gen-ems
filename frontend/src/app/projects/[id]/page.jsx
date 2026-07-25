'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { StatusBadge, AssetCode, LoadingSpinner, ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-summary', id],
    queryFn: async () => { const { data } = await api.get(`/projects/${id}/summary`); return data; },
  });

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorMessage message={error.message} /></AppShell>;

  const { project, assetCount, assetCountByCategory, assets, fuelConsumedThisMonthLiters, incidentCount } = data;

  return (
    <AppShell>
      <div className="mb-6">
        <button onClick={() => router.push('/projects')} className="text-slate-400 text-sm mb-3">← Back to Projects</button>
        <div className="flex items-start justify-between">
          <div>
            <span className="asset-code">{project.projectCode}</span>
            <h1 className="text-2xl font-bold text-navy-900 mt-1">{project.projectName}</h1>
            <p className="text-slate-400 text-sm">{project.clientName} · {project.city}, {project.country} · {project.sector}</p>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
            project.projectStatus === 'Active' ? 'bg-green-100 text-green-800' :
            project.projectStatus === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
            'bg-slate-100 text-slate-700'}`}>
            {project.projectStatus}
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Assets', value: assetCount },
          { label: 'Fuel This Month', value: `${Number(fuelConsumedThisMonthLiters).toFixed(0)} L` },
          { label: 'Incidents', value: incidentCount },
          { label: 'Planned Completion', value: new Date(project.plannedCompletionDate).toLocaleDateString() },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-2xl font-bold text-navy-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Assets by category */}
      {Object.keys(assetCountByCategory).length > 0 && (
        <div className="card mb-4 p-5">
          <h3 className="font-semibold text-navy-800 mb-3">Assets by Category</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(assetCountByCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-lg font-bold text-navy-900">{count}</span>
                <span className="text-sm text-slate-500">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset list */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-navy-800">Assets on Site</h3>
        </div>
        {assets.length === 0 ? (
          <p className="p-5 text-slate-400 text-sm text-center">No assets currently assigned to this project</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>Asset No.</th><th>Make / Model</th><th>Category</th><th>Status</th></tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="cursor-pointer" onClick={() => router.push(`/assets/${a.id}`)}>
                  <td><AssetCode code={a.assetNumber} /></td>
                  <td className="font-medium">{a.make} {a.model}</td>
                  <td className="text-slate-500">{a.subType?.category?.categoryName ?? '—'}</td>
                  <td><StatusBadge status={a.currentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
