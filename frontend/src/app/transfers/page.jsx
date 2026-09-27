'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { AssetCode, LoadingSpinner, ErrorMessage, EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const STATUS_COLORS = {
  Pending: 'badge-maintenance', Approved: 'badge-transit', Dispatched: 'badge-transit',
  'In Transit': 'badge-transit', Completed: 'badge-active', Rejected: 'badge-decommissioned',
};

export default function TransfersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('queue');

  const isFleetMgr = ['FLEET_MGR', 'SYS_ADMIN'].includes(user?.role);

  const queue = useQuery({
    queryKey: ['transfer-queue'],
    queryFn: async () => { const { data } = await api.get('/transfers/queue'); return data; },
    enabled: isFleetMgr && tab === 'queue',
  });

  // FIXED: this mutation previously had NO onError handler. approveTransfer()
  // on the backend returns HTTP 409 with { blocked: true, compliance: { issues } }
  // whenever compliance checks fail (Gulf Registration / Insurance / Driver
  // License / open job card) — which is the NORMAL path per FR-ET-002, not an
  // exceptional one, since the Fleet Manager is meant to see why it's blocked
  // and decide whether to override. Axios treats 409 as a rejected promise, so
  // with no onError this silently did nothing — exactly the "frozen button"
  // symptom. Now: on block, show the specific failed checks and offer an
  // override (which the backend already supports via overrideReason — this
  // UI just never exposed it). The original transfer id is captured in the
  // closure below, NOT read from the response body (the response shape for a
  // blocked result doesn't include the id).
  function approveWithHandling(id) {
    api.post(`/transfers/${id}/approve`, { remarks: 'Approved' })
      .then((res) => {
        if (res.data.blocked) {
          const issues = res.data.compliance.issues
            .map((i) => `• ${i.check}: ${i.status}${i.reason ? ` — ${i.reason}` : ''}`)
            .join('\n');
          const proceed = window.confirm(
            `This transfer is blocked by compliance checks:\n\n${issues}\n\nOverride and approve anyway? You'll need to provide a reason.`
          );
          if (proceed) {
            const overrideReason = window.prompt('Reason for override (required, logged on the record):');
            if (overrideReason) {
              api.post(`/transfers/${id}/approve`, { remarks: 'Approved with override', overrideReason })
                .then(() => qc.invalidateQueries(['transfer-queue']))
                .catch((err) => alert(err.response?.data?.error || 'Override approval failed.'));
            }
          }
          return;
        }
        qc.invalidateQueries(['transfer-queue']);
      })
      .catch((err) => {
        alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || 'Approval failed — see console for details.');
        console.error('Transfer approval error:', err.response?.data || err);
      });
  }

  const approveMutation = useMutation({
    mutationFn: (id) => approveWithHandling(id),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/transfers/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries(['transfer-queue']),
    onError: (err) => alert(err.response?.data?.error || 'Rejection failed.'),
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Equipment Transfers</h1>
        <button className="btn-primary" onClick={() => router.push('/transfers/new')}>+ Submit Request</button>
      </div>

      {isFleetMgr && (
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {['queue', 'history'].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                tab === t ? 'border-white text-gray-900' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>{t === 'queue' ? 'Approval Queue' : 'History'}</button>
          ))}
        </div>
      )}

      {tab === 'queue' && isFleetMgr && (
        <div className="card">
          {queue.isLoading ? <LoadingSpinner />
          : queue.error ? <div className="p-4"><ErrorMessage message={queue.error.message} /></div>
          : !queue.data?.length ? <EmptyState title="No pending transfers" description="No transfer requests awaiting approval." />
          : (
            <table className="table-base">
              <thead><tr><th>Transfer No.</th><th>Asset</th><th>Reason</th><th>Requested By</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {queue.data.map((tr) => (
                  <tr key={tr.id}>
                    <td><AssetCode code={tr.transferNumber} /></td>
                    <td className="font-medium">{tr.asset?.assetNumber} — {tr.asset?.make} {tr.asset?.model}</td>
                    <td className="text-slate-500">{tr.transferReason}</td>
                    <td className="text-slate-500">{tr.requestedByEmployee?.fullName}</td>
                    <td className="text-slate-500">{new Date(tr.requestedAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs py-1 px-2"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(tr.id)}>
                          {approveMutation.isPending ? 'Checking…' : 'Approve'}
                        </button>
                        <button className="btn-danger text-xs py-1 px-2"
                          disabled={rejectMutation.isPending}
                          onClick={() => { const reason = prompt('Rejection reason:'); if (reason) rejectMutation.mutate({ id: tr.id, reason }); }}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card p-5">
          <p className="text-slate-400 text-sm">Enter an Asset ID on the Asset detail page to view its transfer chain of custody.</p>
        </div>
      )}

      {!isFleetMgr && (
        <div className="card p-5">
          <p className="text-slate-400 text-sm">Submit a new transfer request using the button above. Your Fleet Manager will review and approve it.</p>
        </div>
      )}
    </AppShell>
  );
}