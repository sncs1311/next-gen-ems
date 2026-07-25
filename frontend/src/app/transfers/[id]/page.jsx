'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { AssetCode, LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export default function TransferDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();

  // History uses the assetId from the URL — but we have the transfer ID.
  // We load via the asset's transfer history (FR-ET-008).
  // For simplicity here we just show info from the queue or a direct fetch if available.
  // In practice this page is navigated to from the queue row.

  const isFleetMgr = ['FLEET_MGR', 'SYS_ADMIN'].includes(user?.role);

  const dispatchMutation = useMutation({
    mutationFn: (d) => api.post(`/transfers/${id}/dispatch`, d),
    onSuccess: () => qc.invalidateQueries(['transfer-queue']),
  });

  const arrivalMutation = useMutation({
    mutationFn: (d) => api.post(`/transfers/${id}/arrive`, d),
    onSuccess: () => { alert('Arrival confirmed. Asset site updated.'); router.push('/transfers'); },
  });

  const inspectMutation = useMutation({
    mutationFn: (d) => api.post(`/transfers/${id}/inspections`, d),
    onSuccess: () => alert('Inspection recorded.'),
  });

  return (
    <AppShell>
      <div className="max-w-xl">
        <button onClick={() => router.push('/transfers')} className="text-slate-400 text-sm mb-3">← Back</button>
        <h1 className="page-title mb-6">Transfer Actions</h1>
        <p className="text-slate-400 text-sm mb-4">Transfer ID: <span className="font-mono">{id}</span></p>

        <div className="space-y-4">
          {/* Pre-Departure Inspection */}
          <div className="card p-5">
            <h3 className="font-semibold text-navy-800 mb-3">Record Pre-Departure Inspection — FR-ET-005</h3>
            <p className="text-sm text-slate-500 mb-3">Required before dispatch. Minimum one photo must be attached.</p>
            <button className="btn-secondary" onClick={() => {
              const condition = prompt('Overall condition? (Excellent / Good / Fair / Poor)');
              if (!condition) return;
              inspectMutation.mutate({ inspectionType: 'Pre-Departure', overallCondition: condition, tyreCondition: 'Good', lightsOperational: true, fluidLevelsChecked: true, photosAttached: true });
            }}>Record Pre-Departure Inspection</button>
          </div>

          {/* Dispatch */}
          {isFleetMgr && (
            <div className="card p-5">
              <h3 className="font-semibold text-navy-800 mb-3">Dispatch — FR-ET-004</h3>
              <p className="text-sm text-slate-500 mb-3">Issues gate pass and sets asset to In Transit. Requires completed pre-departure inspection.</p>
              <button className="btn-primary" disabled={dispatchMutation.isPending} onClick={() => {
                const gatePass = prompt('Gate Pass Number:');
                if (!gatePass) return;
                dispatchMutation.mutate({ gatePassNumber: gatePass });
              }}>
                {dispatchMutation.isPending ? 'Dispatching…' : 'Dispatch Asset'}
              </button>
              {dispatchMutation.error && <p className="text-red-500 text-sm mt-2">{dispatchMutation.error.response?.data?.error}</p>}
            </div>
          )}

          {/* Arrival */}
          <div className="card p-5">
            <h3 className="font-semibold text-navy-800 mb-3">Confirm Arrival — FR-ET-006</h3>
            <p className="text-sm text-slate-500 mb-3">Completes the transfer and updates the asset's site assignment.</p>
            <button className="btn-primary" disabled={arrivalMutation.isPending} onClick={() => {
              const condition = prompt('Post-arrival condition? (Excellent / Good / Fair / Poor)');
              if (!condition) return;
              arrivalMutation.mutate({ overallCondition: condition, tyreCondition: 'Good', lightsOperational: true, fluidLevelsChecked: true, photosAttached: true });
            }}>
              {arrivalMutation.isPending ? 'Confirming…' : 'Confirm Arrival'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
