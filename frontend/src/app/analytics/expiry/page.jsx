'use client';
// frontend/src/app/analytics/expiry/page.jsx
import { useQuery } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

export default function ExpiryAlertsPage() {
  const { data: alerts, isLoading, error } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: async () => { const { data } = await api.get('/analytics/expiry-alerts'); return data; },
  });

  const red    = alerts?.filter((a) => a.urgency === 'red')    ?? [];
  const amber  = alerts?.filter((a) => a.urgency === 'amber')  ?? [];
  const green  = alerts?.filter((a) => a.urgency === 'green')  ?? [];

  function AlertTable({ items, label, badgeClass }) {
    if (!items.length) return null;
    return (
      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>{label}</span>
          <span className="text-gray-400 text-sm font-normal">{items.length} item{items.length > 1 ? 's' : ''}</span>
        </h3>
        <table className="table-base">
          <thead><tr><th>Type</th><th>Entity</th><th>Detail</th><th>Expiry Date</th><th>Days Left</th></tr></thead>
          <tbody>
            {items.map((a, i) => (
              <tr key={i}>
                <td className="text-sm">{a.type}</td>
                <td className="font-mono text-sm font-medium">{a.entity}</td>
                <td className="text-gray-500 text-sm">{a.detail}</td>
                <td className="text-sm">{new Date(a.expiryDate).toLocaleDateString()}</td>
                <td className={`font-semibold text-sm ${a.daysLeft <= 0 ? 'text-red-600' : a.daysLeft <= 30 ? 'text-red-500' : 'text-yellow-600'}`}>
                  {a.daysLeft <= 0 ? 'EXPIRED' : `${a.daysLeft}d`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expiry Alert Panel</h1>
          <p className="text-gray-400 text-sm mt-1">FR-AD-007 — Gulf registrations, insurance, certifications, driver licenses</p>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : error ? <ErrorMessage message={error.message} /> : (
        <div className="max-w-4xl">
          {!alerts?.length ? (
            <div className="card p-12 text-center text-gray-400">No expiry alerts within the next 90 days</div>
          ) : (
            <>
              <AlertTable items={red}   label="Expires within 30 days" badgeClass="bg-red-100 text-red-700 border-red-200" />
              <AlertTable items={amber} label="Expires within 60 days" badgeClass="bg-yellow-100 text-yellow-700 border-yellow-200" />
              <AlertTable items={green} label="Expires within 90 days" badgeClass="bg-gray-100 text-gray-600 border-gray-200" />
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}