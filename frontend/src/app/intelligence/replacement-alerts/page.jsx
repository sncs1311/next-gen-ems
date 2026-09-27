'use client';
// frontend/src/app/intelligence/replacement-alerts/page.jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage, AssetCode } from '@/components/ui';
import api from '@/lib/api';

const SEVERITY_STYLES = {
  Critical: 'bg-red-100 text-red-700 border border-red-200',
  High:     'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Medium:   'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function ReplacementAlertsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['replacement-alerts'],
    queryFn: async () => {
      const { data } = await api.get('/intelligence/replacement-alerts');
      return data;
    },
    retry: false,
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/intelligence/run/replacement'),
    onSuccess: () => qc.invalidateQueries(['replacement-alerts']),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id) => api.patch(`/intelligence/replacement-alerts/${id}/acknowledge`),
    onSuccess: () => qc.invalidateQueries(['replacement-alerts']),
  });

  const critical = data?.filter((a) => a.severity === 'Critical') ?? [];
  const high = data?.filter((a) => a.severity === 'High') ?? [];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Replacement Alerts</h1>
          <p className="text-gray-400 text-sm mt-1">
            FR-IL-005 — Assets where cumulative repair cost exceeds book value thresholds
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
        >
          {triggerMutation.isPending ? 'Running…' : '↻ Run Alert Engine'}
        </button>
      </div>

      {/* Threshold explanation */}
      <div className="card p-4 mb-6 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_STYLES.Critical}`}>Critical</span>
          <span className="text-gray-500">Repair cost ≥ 80% of book value — replacement strongly recommended</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_STYLES.High}`}>High</span>
          <span className="text-gray-500">Repair cost ≥ 60% of book value — consider replacement</span>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : error ? (
        <div className="card p-6"><ErrorMessage message={error.message} /></div>
      ) : !data?.length ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 mb-2">No replacement alerts active.</p>
          <p className="text-gray-400 text-sm">
            Click "Run Alert Engine" to check all assets against book value thresholds.
          </p>
        </div>
      ) : (
        <>
          {/* Critical alerts */}
          {critical.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_STYLES.Critical}`}>Critical</span>
                {critical.length} asset{critical.length > 1 ? 's' : ''} — immediate action required
              </h2>
              <div className="card divide-y divide-gray-100">
                {critical.map((alert) => (
                  <div key={alert.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <AssetCode code={alert.entity?.assetNumber} />
                        <span className="text-gray-500 text-sm">
                          {alert.entity?.make} {alert.entity?.model}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => router.push(`/assets/${alert.entityId}`)}
                      >
                        View Asset
                      </button>
                      {!alert.isAcknowledged && (
                        <button
                          className="btn-primary text-xs"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High alerts */}
          {high.length > 0 && (
            <div>
              <h2 className="font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_STYLES.High}`}>High</span>
                {high.length} asset{high.length > 1 ? 's' : ''} — plan for replacement
              </h2>
              <div className="card divide-y divide-gray-100">
                {high.map((alert) => (
                  <div key={alert.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <AssetCode code={alert.entity?.assetNumber} />
                        <span className="text-gray-500 text-sm">
                          {alert.entity?.make} {alert.entity?.model}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => router.push(`/assets/${alert.entityId}`)}
                      >
                        View Asset
                      </button>
                      {!alert.isAcknowledged && (
                        <button
                          className="btn-primary text-xs"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}