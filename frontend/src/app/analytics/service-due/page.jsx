'use client';
// frontend/src/app/analytics/service-due/page.jsx
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage, AssetCode } from '@/components/ui';
import api from '@/lib/api';

export default function ServiceDuePage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets-due'],
    queryFn: async () => { const { data } = await api.get('/analytics/assets-due'); return data; },
  });

  const OVERDUE_COLORS = {
    'Critical': 'badge-decommissioned',
    'Warning':  'badge-maintenance',
    'OK':       'badge-idle',
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets Due for Service</h1>
          <p className="text-gray-400 text-sm mt-1">FR-AD-008 — Based on preventive maintenance schedules</p>
        </div>
      </div>

      <div className="card">
        {isLoading ? <LoadingSpinner />
          : error ? <div className="p-4"><ErrorMessage message={error.message} /></div>
          : !data?.length ? (
            <div className="p-12 text-center text-gray-400">
              No overdue preventive maintenance schedules found.
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Make / Model</th>
                  <th>Service Type</th>
                  <th>Next Due (hrs)</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.assetId} className="cursor-pointer" onClick={() => router.push(`/assets/${a.assetId}`)}>
                    <td><AssetCode code={a.assetNumber} /></td>
                    <td className="font-medium">{a.make} {a.model}</td>
                    <td className="text-gray-500">{a.serviceType || '—'}</td>
                    <td className="text-gray-500">{a.nextDueHours ? `${Number(a.nextDueHours).toFixed(0)}h` : '—'}</td>
                    <td><span className={OVERDUE_COLORS[a.overdueStatus] || 'badge-idle'}>{a.overdueStatus}</span></td>
                    <td className="text-right">
                      <button
                        className="text-gray-600 hover:underline text-sm font-medium"
                        onClick={(e) => { e.stopPropagation(); router.push('/maintenance/job-cards/new'); }}>
                        Create Job Card →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </AppShell>
  );
}