'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const TYPES = ['Near Miss', 'Minor Accident', 'Major Accident', 'Fire', 'Equipment Tip-Over', 'Falling Object', 'Third-Party Property Damage', 'Personal Injury'];
const THIRD_PARTY_TYPES = ['Minor Accident', 'Major Accident', 'Third-Party Property Damage'];

export default function NewIncidentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ assetId: '', driverId: '', incidentType: '', occurredAt: '', thirdPartyInvolved: false, thirdPartyVehiclePlate: '', personalInjuryOccurred: false, policeReportNumber: '' });
  const [err, setErr] = useState('');
  const mutation = useMutation({
    mutationFn: (d) => api.post('/incidents', d),
    onSuccess: () => router.push('/incidents'),
    onError: (e) => setErr(e.response?.data?.error || 'Failed to file report'),
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  const needsThirdParty = THIRD_PARTY_TYPES.includes(form.incidentType);

  return (
    <AppShell>
      <div className="max-w-xl">
        <button onClick={() => router.push('/incidents')} className="text-slate-400 text-sm mb-3">← Back</button>
        <h1 className="page-title mb-6">File Incident Report</h1>
        {err && <div className="mb-4"><ErrorMessage message={err} /></div>}
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Asset ID *</label><input required className="form-input" placeholder="UUID" value={form.assetId} onChange={(e) => set('assetId', e.target.value)} /></div>
            <div><label className="form-label">Driver ID *</label><input required className="form-input" placeholder="UUID" value={form.driverId} onChange={(e) => set('driverId', e.target.value)} /></div>
          </div>
          <div><label className="form-label">Incident Type *</label>
            <select required className="form-select" value={form.incidentType} onChange={(e) => set('incidentType', e.target.value)}>
              <option value="">Select…</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="form-label">Date & Time of Incident *</label>
            <input required type="datetime-local" className="form-input" value={form.occurredAt} onChange={(e) => set('occurredAt', e.target.value)} />
          </div>

          {needsThirdParty && (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-200 space-y-3">
              <p className="text-sm font-medium text-amber-800">Third-Party Details Required (FR-IM-002)</p>
              <div><label className="form-label">Third-Party Vehicle Plate</label>
                <input className="form-input" value={form.thirdPartyVehiclePlate} onChange={(e) => set('thirdPartyVehiclePlate', e.target.value)} /></div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="injury" checked={form.personalInjuryOccurred} onChange={(e) => set('personalInjuryOccurred', e.target.checked)} className="w-4 h-4 accent-amber-500" />
            <label htmlFor="injury" className="text-sm font-medium text-slate-700">Personal injury occurred</label>
          </div>

          <div><label className="form-label">Police Report Number</label>
            <input className="form-input" placeholder="Leave blank if not applicable" value={form.policeReportNumber} onChange={(e) => set('policeReportNumber', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-danger" disabled={mutation.isPending}
              onClick={() => mutation.mutate({ ...form, thirdPartyInvolved: needsThirdParty, occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined })}>
              {mutation.isPending ? 'Filing…' : 'File Report'}
            </button>
            <button className="btn-secondary" onClick={() => router.push('/incidents')}>Cancel</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
