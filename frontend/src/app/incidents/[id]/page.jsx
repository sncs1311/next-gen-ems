'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const ROOT_CAUSE_OPTIONS = ['Human Error', 'Mechanical Failure', 'Environmental Conditions', 'Procedural Violation', 'Unknown'];

export default function IncidentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rcForm, setRcForm] = useState({ rootCauseCategory: '', rootCauseDescription: '', correctiveAction: '' });
  const [showRcForm, setShowRcForm] = useState(false);

  const { data: inc, isLoading, error } = useQuery({
    queryKey: ['incident', id],
    queryFn: async () => { const { data } = await api.get(`/incidents/${id}`); return data; },
  });

  const rootCauseMutation = useMutation({
    mutationFn: (d) => api.post(`/incidents/${id}/root-cause`, d),
    onSuccess: () => { qc.invalidateQueries(['incident', id]); setShowRcForm(false); },
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/incidents/${id}/close`),
    onSuccess: () => qc.invalidateQueries(['incident', id]),
  });

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorMessage message={error.message} /></AppShell>;

  const isClosed = inc.incidentStatus === 'Closed';
  const canClose = ['HSE', 'SYS_ADMIN'].includes(user?.role) && !isClosed && inc.rootCauseCategory;

  return (
    <AppShell>
      <div className="max-w-2xl">
        <button onClick={() => router.push('/incidents')} className="text-slate-400 text-sm mb-3">← Back to Incidents</button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-sm text-slate-400">{inc.incidentNumber}</span>
            <h1 className="text-2xl font-bold text-navy-900 mt-1">{inc.incidentType}</h1>
            <p className="text-slate-400 text-sm">{new Date(inc.occurredAt).toLocaleString()}</p>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${isClosed ? 'bg-slate-100 text-slate-600' : 'bg-yellow-100 text-yellow-800'}`}>
            {inc.incidentStatus}
          </span>
        </div>

        {/* Details */}
        <div className="card p-5 mb-4">
          <h3 className="font-semibold text-navy-800 mb-3">Incident Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-xs text-slate-400">Asset</dt><dd className="font-mono font-medium">{inc.asset?.assetNumber ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">Driver</dt><dd>{inc.driver?.employee?.fullName ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">Third Party Involved</dt><dd>{inc.thirdPartyInvolved ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-xs text-slate-400">Personal Injury</dt><dd className={inc.personalInjuryOccurred ? 'text-red-500 font-medium' : ''}>{inc.personalInjuryOccurred ? 'Yes ⚠' : 'No'}</dd></div>
            <div><dt className="text-xs text-slate-400">Police Report</dt><dd className="font-mono">{inc.policeReportNumber || '—'}</dd></div>
          </dl>
          {inc.thirdPartyVehiclePlate && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
              <span className="text-xs text-slate-400 block mb-1">Third-Party Vehicle</span>
              <span className="font-mono">{inc.thirdPartyVehiclePlate}</span>
              {inc.thirdPartyCompany && <span className="text-slate-500 ml-2">— {inc.thirdPartyCompany}</span>}
            </div>
          )}
        </div>

        {/* Root Cause */}
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-navy-800">Root Cause & Corrective Action — FR-IM-005</h3>
            {!isClosed && ['HSE', 'SYS_ADMIN'].includes(user?.role) && !inc.rootCauseCategory && (
              <button className="btn-secondary text-xs" onClick={() => setShowRcForm(true)}>Record</button>
            )}
          </div>
          {inc.rootCauseCategory ? (
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-slate-400">Root Cause Category</dt><dd className="font-medium">{inc.rootCauseCategory}</dd></div>
              <div><dt className="text-xs text-slate-400">Root Cause Description</dt><dd className="text-slate-600">{inc.rootCauseDescription}</dd></div>
              <div><dt className="text-xs text-slate-400">Corrective Action</dt><dd className="text-slate-600">{inc.correctiveAction}</dd></div>
            </dl>
          ) : (
            <p className="text-slate-400 text-sm">Not yet recorded — required before closure</p>
          )}
          {showRcForm && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="form-label">Root Cause Category *</label>
                <select className="form-select" value={rcForm.rootCauseCategory} onChange={(e) => setRcForm({ ...rcForm, rootCauseCategory: e.target.value })}>
                  <option value="">Select…</option>
                  {ROOT_CAUSE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Root Cause Description</label>
                <textarea rows={2} className="form-input" value={rcForm.rootCauseDescription} onChange={(e) => setRcForm({ ...rcForm, rootCauseDescription: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Corrective Action *</label>
                <textarea rows={2} className="form-input" value={rcForm.correctiveAction} onChange={(e) => setRcForm({ ...rcForm, correctiveAction: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button className="btn-primary text-sm" disabled={rootCauseMutation.isPending} onClick={() => rootCauseMutation.mutate(rcForm)}>
                  {rootCauseMutation.isPending ? 'Saving…' : 'Save Root Cause'}
                </button>
                <button className="btn-secondary text-sm" onClick={() => setShowRcForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {canClose && (
          <div className="card p-5 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-yellow-800 mb-2">Close Incident</h3>
            <p className="text-sm text-amber-700 mb-3">
              Closing this report will apply the driver score impact ({inc.incidentType}) and mark the case as resolved.
              {['Major Accident', 'Third-Party Property Damage'].includes(inc.incidentType) && !inc.policeReportNumber && (
                <span className="block mt-1 text-red-600 font-medium">⚠ Police report number required before closing this incident type (NFR-RC-003)</span>
              )}
            </p>
            <button className="btn-danger" disabled={closeMutation.isPending} onClick={() => {
              if (confirm('Close this incident? This will apply the driver score impact and cannot be undone.')) {
                closeMutation.mutate();
              }
            }}>
              {closeMutation.isPending ? 'Closing…' : 'Close Incident Report'}
            </button>
            {closeMutation.error && <p className="text-red-500 text-sm mt-2">{closeMutation.error.response?.data?.error}</p>}
          </div>
        )}

        {isClosed && (
          <div className="card p-5 bg-slate-50">
            <p className="text-sm text-slate-500">Closed on {inc.closureDate ? new Date(inc.closureDate).toLocaleDateString() : '—'}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
